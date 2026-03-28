import { useCallback, useState } from "react";

import { buildDedupKey, buildDedupSet } from "@packages/domain/csv/csvDedup";
import type {
  ActivityLogValidationError,
  CSVParseResult,
  ColumnMapping,
  ValidatedActivityLog,
} from "@packages/domain/csv/csvParser";
import {
  autoDetectMapping,
  detectEncoding,
  parseCSVText,
  validateDate,
  validateQuantity,
} from "@packages/domain/csv/csvParser";
import { i18next, useTranslation } from "@packages/i18n";

import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import type { DexieActivity, DexieActivityKind } from "../db/schema";
import { syncEngine } from "../sync/syncEngine";

export type { ColumnMapping, ValidatedActivityLog, ActivityLogValidationError };

async function parseCSVFile(file: File): Promise<CSVParseResult> {
  const buffer = await file.slice(0, 1024).arrayBuffer();
  const encoding = detectEncoding(buffer);
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, encoding);
  });
  return parseCSVText(text);
}

function validateRowWithMapping(
  row: Record<string, string>,
  mapping: ColumnMapping,
  activities: DexieActivity[],
  allKinds: DexieActivityKind[],
): ValidatedActivityLog {
  const errors: ActivityLogValidationError[] = [];

  const date = mapping.date ? row[mapping.date] : "";
  let activityName = mapping.activity ? row[mapping.activity] : "";
  let activityId: string | undefined;
  let isFixedActivity = false;

  if (mapping.fixedActivityId) {
    const fixed = activities.find((a) => a.id === mapping.fixedActivityId);
    if (fixed) {
      activityName = fixed.name;
      activityId = fixed.id;
      isFixedActivity = true;
    }
  }

  const kindName = mapping.kind ? row[mapping.kind] : undefined;
  const quantityStr = mapping.quantity ? row[mapping.quantity] : "";
  const memo = mapping.memo ? row[mapping.memo] : undefined;

  const dateError = validateDate(date);
  if (dateError) errors.push({ field: "date", message: dateError });

  if (!isFixedActivity && !activityName) {
    errors.push({
      field: "activity",
      message: i18next.t("csv:validation.activityRequired"),
    });
  }

  const { value: quantity, error: quantityError } =
    validateQuantity(quantityStr);
  if (quantityError) errors.push({ field: "quantity", message: quantityError });

  let isNew = false;
  if (!isFixedActivity && activityName) {
    const existing = activities.find((a) => a.name === activityName);
    if (!existing) {
      isNew = true;
    } else {
      activityId = existing.id;
      if (kindName) {
        const kinds = allKinds.filter((k) => k.activityId === existing.id);
        const hasKind = kinds.some((k) => k.name === kindName);
        if (!hasKind) {
          errors.push({
            field: "kind",
            message: i18next.t("csv:validation.kindNotFound", {
              activity: activityName,
              kind: kindName,
            }),
          });
        }
      }
    }
  }

  return {
    date: date || "",
    activityName: activityName || "",
    activityId,
    kindName,
    quantity,
    memo,
    isNewActivity: isNew,
    errors,
  };
}

// --- Import Progress ---

export type ImportProgress = {
  total: number;
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
};

export type ImportResult = {
  success: boolean;
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
};

// --- Main Hook ---

type Step = "file" | "mapping" | "preview";

export function useCSVImport(onComplete: () => void) {
  const { t } = useTranslation("csv");
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validatedLogs, setValidatedLogs] = useState<ValidatedActivityLog[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
    skipped: 0,
    failed: 0,
  });

  const reset = useCallback(() => {
    setStep("file");
    setFile(null);
    setParsedData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setValidatedLogs([]);
    setError(null);
    setIsParsing(false);
    setIsImporting(false);
    setImportSuccess(false);
    setProgress({
      total: 0,
      processed: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
    });
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setImportSuccess(false);
  }, []);

  const handleParse = useCallback(async () => {
    if (!file) return;
    setIsParsing(true);
    setError(null);
    try {
      const result = await parseCSVFile(file);
      if (result.data.length === 0) {
        setError(t("noData"));
        return;
      }
      setParsedData(result.data);
      setCsvHeaders(result.headers);
      setColumnMapping(autoDetectMapping(result.headers));
      setStep("mapping");
    } catch {
      setError(t("parseError"));
    } finally {
      setIsParsing(false);
    }
  }, [file]);

  const handleMappingConfirm = useCallback(async () => {
    // Validate required mapping
    const mappingErrors: string[] = [];
    if (!columnMapping.date) mappingErrors.push(t("validation.dateRequired"));
    if (!columnMapping.activity && !columnMapping.fixedActivityId)
      mappingErrors.push(t("validation.activityOrFixed"));
    if (!columnMapping.quantity)
      mappingErrors.push(t("validation.quantityRequired"));

    if (mappingErrors.length > 0) {
      setError(mappingErrors.join("\n"));
      return;
    }

    // Get activities and kinds from Dexie
    const activities = await activityRepository.getAllActivities();
    const allKinds = await activityRepository.getAllActivityKinds();

    const validated = parsedData.map((row) =>
      validateRowWithMapping(row, columnMapping, activities, allKinds),
    );
    setValidatedLogs(validated);
    setStep("preview");

    const totalErrors = validated.filter((l) => l.errors.length > 0).length;
    if (totalErrors > 0) {
      setError(`${totalErrors}${t("validation.errorsFound")}`);
    } else {
      setError(null);
    }
  }, [parsedData, columnMapping, t]);

  const handleEdit = useCallback(
    async (index: number, field: keyof ValidatedActivityLog, value: string) => {
      const activities = await activityRepository.getAllActivities();
      const allKinds = await activityRepository.getAllActivityKinds();

      setValidatedLogs((prev) => {
        const updated = [...prev];
        const log = { ...updated[index] };

        switch (field) {
          case "quantity":
            log[field] = Number(value) || 0;
            break;
          case "date":
          case "activityName":
          case "kindName":
          case "memo":
            log[field] = value;
            break;
          case "activityId":
          case "isNewActivity":
          case "errors":
            return prev;
        }

        if (field === "activityName") {
          log.kindName = "";
        }

        // Re-validate
        const rowData: Record<string, string> = {};
        if (columnMapping.date) rowData[columnMapping.date] = log.date;
        if (columnMapping.activity)
          rowData[columnMapping.activity] = log.activityName;
        if (columnMapping.kind && log.kindName)
          rowData[columnMapping.kind] = log.kindName;
        if (columnMapping.quantity)
          rowData[columnMapping.quantity] = log.quantity.toString();
        if (columnMapping.memo && log.memo)
          rowData[columnMapping.memo] = log.memo;

        const revalidated = validateRowWithMapping(
          rowData,
          columnMapping,
          activities,
          allKinds,
        );
        updated[index] = revalidated;

        const totalErrors = updated.filter((l) => l.errors.length > 0).length;
        if (totalErrors > 0) {
          setError(`${totalErrors}${t("validation.errorsFound")}`);
        } else {
          setError(null);
        }

        return updated;
      });
    },
    [columnMapping],
  );

  const handleRemove = useCallback((indices: number[]) => {
    setValidatedLogs((prev) => prev.filter((_, i) => !indices.includes(i)));
  }, []);

  const handleImport = useCallback(
    async (logs: ValidatedActivityLog[]) => {
      const toImport = logs.filter((l) => l.errors.length === 0);
      if (toImport.length === 0) {
        setError(t("noImportData"));
        return;
      }

      setIsImporting(true);
      setError(null);
      setProgress({
        total: toImport.length,
        processed: 0,
        succeeded: 0,
        skipped: 0,
        failed: 0,
      });

      try {
        const activities = await activityRepository.getAllActivities();
        const allKinds = await activityRepository.getAllActivityKinds();

        // Create new activities in Dexie
        const newActivityNames = [
          ...new Set(
            toImport
              .filter((l) => l.isNewActivity && l.activityName)
              .map((l) => l.activityName),
          ),
        ];

        const createdActivityMap = new Map<string, string>();
        for (const name of newActivityNames) {
          const created = await activityRepository.createActivity({
            name,
            quantityUnit: "回",
            emoji: "📊",
            showCombinedStats: false,
          });
          createdActivityMap.set(name, created.id);
        }

        // 重複チェック: インポート対象日の既存ログを取得してdedupSetを構築
        const dates = toImport.map((l) =>
          l.date.includes("T") ? l.date.split("T")[0] : l.date,
        );
        const minDate = dates.reduce((a, b) => (a < b ? a : b));
        const maxDate = dates.reduce((a, b) => (a > b ? a : b));
        const existingLogs = await activityLogRepository.getActivityLogsBetween(
          minDate,
          maxDate,
        );
        const dedupSet = buildDedupSet(existingLogs);

        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < toImport.length; i++) {
          const log = toImport[i];
          try {
            // Resolve activityId
            let activityId = log.activityId;
            if (!activityId) {
              activityId =
                createdActivityMap.get(log.activityName) ??
                activities.find((a) => a.name === log.activityName)?.id;
            }
            if (!activityId) {
              failed++;
              continue;
            }

            // Resolve kindId
            let activityKindId: string | null = null;
            if (log.kindName) {
              const kind = allKinds.find(
                (k) => k.activityId === activityId && k.name === log.kindName,
              );
              activityKindId = kind?.id ?? null;
            }

            // Format date
            const date = log.date.includes("T")
              ? log.date.split("T")[0]
              : log.date;

            const memo = log.memo ?? "";
            const dedupKey = buildDedupKey({
              date,
              activityId,
              quantity: log.quantity,
              memo,
            });
            if (dedupSet.has(dedupKey)) {
              skipped++;
              continue;
            }

            await activityLogRepository.createActivityLog({
              activityId,
              activityKindId,
              quantity: log.quantity,
              memo,
              date,
              time: null,
              taskId: null,
            });
            // 新たに作成したログもdedupSetに追加（CSV内での重複防止）
            dedupSet.add(dedupKey);
            succeeded++;
          } catch {
            failed++;
          }

          setProgress({
            total: toImport.length,
            processed: i + 1,
            succeeded,
            skipped,
            failed,
          });
        }

        // Trigger sync
        syncEngine.syncAll();

        const messages: string[] = [];
        if (skipped > 0) messages.push(`${skipped}${t("skipDuplicate")}`);
        if (failed > 0) messages.push(`${failed}${t("importFailed")}`);

        if (messages.length === 0) {
          setImportSuccess(true);
          setTimeout(() => {
            onComplete();
            reset();
          }, 1500);
        } else if (failed === 0) {
          setImportSuccess(true);
          setError(messages.join("、"));
          setTimeout(() => {
            onComplete();
            reset();
          }, 2500);
        } else {
          setError(messages.join("、"));
        }
      } catch {
        setError(t("importError"));
      } finally {
        setIsImporting(false);
      }
    },
    [onComplete, reset, t],
  );

  const downloadTemplate = useCallback(() => {
    const template =
      "date,activity,kind,quantity,memo\n2024-01-01,ランニング,ジョギング,5,朝ラン\n2024-01-02,読書,技術書,60,TypeScript本";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activity_log_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    step,
    file,
    csvHeaders,
    parsedData,
    columnMapping,
    setColumnMapping,
    validatedLogs,
    error,
    isParsing,
    isImporting,
    importSuccess,
    progress,
    handleFileSelect,
    handleParse,
    handleMappingConfirm,
    handleEdit,
    handleRemove,
    handleImport,
    downloadTemplate,
    reset,
  };
}
