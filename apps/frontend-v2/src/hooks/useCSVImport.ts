import { useCallback, useState } from "react";
import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import type { DexieActivity, DexieActivityKind } from "../db/schema";
import { syncEngine } from "../sync/syncEngine";

// --- CSV Parser ---

type CSVParseResult = {
  data: Record<string, string>[];
  headers: string[];
};

function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "UTF-8";
  }
  let utf8Count = 0;
  let sjisCount = 0;
  const len = Math.min(bytes.length, 1024);

  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    // UTF-8 multi-byte sequences
    if (b >= 0xc2 && b <= 0xdf && i + 1 < len) {
      if (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xbf) {
        utf8Count++;
        i += 1;
        continue;
      }
    } else if (b >= 0xe0 && b <= 0xef && i + 2 < len) {
      if (
        bytes[i + 1] >= 0x80 &&
        bytes[i + 1] <= 0xbf &&
        bytes[i + 2] >= 0x80 &&
        bytes[i + 2] <= 0xbf
      ) {
        utf8Count++;
        i += 2;
        continue;
      }
    } else if (b >= 0xf0 && b <= 0xf4 && i + 3 < len) {
      if (
        bytes[i + 1] >= 0x80 &&
        bytes[i + 1] <= 0xbf &&
        bytes[i + 2] >= 0x80 &&
        bytes[i + 2] <= 0xbf &&
        bytes[i + 3] >= 0x80 &&
        bytes[i + 3] <= 0xbf
      ) {
        utf8Count++;
        i += 3;
        continue;
      }
    }
    // Shift-JIS multi-byte sequences
    if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) {
      if (i + 1 < len) {
        const b2 = bytes[i + 1];
        if ((b2 >= 0x40 && b2 <= 0x7e) || (b2 >= 0x80 && b2 <= 0xfc)) {
          sjisCount++;
          i += 1;
        }
      }
    }
  }
  return sjisCount > utf8Count ? "Shift-JIS" : "UTF-8";
}

function parseCSVText(text: string): CSVParseResult {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "\n" || ch === "\r") {
      lines.push(current);
      current = "";
      if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  const nonEmpty = lines.filter((l) => l.trim() !== "");
  if (nonEmpty.length === 0) return { data: [], headers: [] };

  const splitRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQ = true;
      } else if (c === ",") {
        fields.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = splitRow(nonEmpty[0]);
  const data = nonEmpty.slice(1).map((line) => {
    const values = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { data, headers };
}

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

// --- Column Mapping ---

export type ColumnMapping = {
  date?: string;
  activity?: string;
  kind?: string;
  quantity?: string;
  memo?: string;
  fixedActivityId?: string;
};

// --- Validation ---

export type ActivityLogValidationError = {
  field: string;
  message: string;
};

export type ValidatedActivityLog = {
  date: string;
  activityName: string;
  activityId?: string;
  kindName?: string;
  quantity: number;
  memo?: string;
  isNewActivity: boolean;
  errors: ActivityLogValidationError[];
};

function validateDate(dateStr: string): string | null {
  if (!dateStr) return "日付は必須です";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "日付の形式が不正です";
  if (d > new Date()) return "未来の日付は指定できません";
  return null;
}

function validateQuantity(str: string): { value: number; error: string | null } {
  if (str === "" || str == null) return { value: 0, error: "数量は必須です" };
  const num = Number(str);
  if (Number.isNaN(num)) return { value: 0, error: "数量は数値で入力してください" };
  if (num < 0) return { value: 0, error: "数量は0以上で入力してください" };
  if (num > 999999) return { value: 0, error: "数量が大きすぎます" };
  return { value: num, error: null };
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
    errors.push({ field: "activity", message: "活動名は必須です" });
  }

  const { value: quantity, error: quantityError } = validateQuantity(quantityStr);
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
            message: `活動「${activityName}」に種別「${kindName}」は存在しません`,
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

// --- Auto-detect mapping ---

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (lower.includes("date") || lower.includes("日付")) {
      mapping.date = header;
    } else if (
      lower.includes("activity") ||
      lower.includes("活動") ||
      lower.includes("アクティビティ")
    ) {
      mapping.activity = header;
    } else if (
      lower.includes("kind") ||
      lower.includes("種別") ||
      lower.includes("タイプ")
    ) {
      mapping.kind = header;
    } else if (
      lower.includes("quantity") ||
      lower.includes("数量") ||
      lower.includes("時間") ||
      lower.includes("回数") ||
      lower === "count" ||
      lower === "cnt"
    ) {
      mapping.quantity = header;
    } else if (
      lower.includes("memo") ||
      lower.includes("メモ") ||
      lower.includes("備考")
    ) {
      mapping.memo = header;
    }
  }
  return mapping;
}

// --- Import Progress ---

export type ImportProgress = {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
};

export type ImportResult = {
  success: boolean;
  summary: { total: number; succeeded: number; failed: number };
};

// --- Main Hook ---

type Step = "file" | "mapping" | "preview";

export function useCSVImport(onComplete: () => void) {
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validatedLogs, setValidatedLogs] = useState<ValidatedActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
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
    setProgress({ total: 0, processed: 0, succeeded: 0, failed: 0 });
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
        setError("CSVにデータ行がありません");
        return;
      }
      setParsedData(result.data);
      setCsvHeaders(result.headers);
      setColumnMapping(autoDetectMapping(result.headers));
      setStep("mapping");
    } catch {
      setError("ファイルの解析に失敗しました");
    } finally {
      setIsParsing(false);
    }
  }, [file]);

  const handleMappingConfirm = useCallback(async () => {
    // Validate required mapping
    const mappingErrors: string[] = [];
    if (!columnMapping.date) mappingErrors.push("日付カラムのマッピングが必要です");
    if (!columnMapping.activity && !columnMapping.fixedActivityId)
      mappingErrors.push("アクティビティカラムまたは固定アクティビティの選択が必要です");
    if (!columnMapping.quantity) mappingErrors.push("数量カラムのマッピングが必要です");

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
      setError(`${totalErrors}件のエラーが見つかりました。修正してからインポートしてください。`);
    } else {
      setError(null);
    }
  }, [parsedData, columnMapping]);

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
        if (columnMapping.activity) rowData[columnMapping.activity] = log.activityName;
        if (columnMapping.kind && log.kindName) rowData[columnMapping.kind] = log.kindName;
        if (columnMapping.quantity) rowData[columnMapping.quantity] = log.quantity.toString();
        if (columnMapping.memo && log.memo) rowData[columnMapping.memo] = log.memo;

        const revalidated = validateRowWithMapping(rowData, columnMapping, activities, allKinds);
        updated[index] = revalidated;

        const totalErrors = updated.filter((l) => l.errors.length > 0).length;
        if (totalErrors > 0) {
          setError(`${totalErrors}件のエラーがあります。修正してからインポートしてください。`);
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
        setError("インポートできるデータがありません");
        return;
      }

      setIsImporting(true);
      setError(null);
      setProgress({ total: toImport.length, processed: 0, succeeded: 0, failed: 0 });

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

        let succeeded = 0;
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

            await activityLogRepository.createActivityLog({
              activityId,
              activityKindId,
              quantity: log.quantity,
              memo: log.memo ?? "",
              date,
              time: null,
            });
            succeeded++;
          } catch {
            failed++;
          }

          setProgress({
            total: toImport.length,
            processed: i + 1,
            succeeded,
            failed,
          });
        }

        // Trigger sync
        syncEngine.syncAll();

        if (failed === 0) {
          setImportSuccess(true);
          setTimeout(() => {
            onComplete();
            reset();
          }, 1500);
        } else {
          setError(`${failed}件のインポートに失敗しました`);
        }
      } catch {
        setError("インポート中にエラーが発生しました");
      } finally {
        setIsImporting(false);
      }
    },
    [onComplete, reset],
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
