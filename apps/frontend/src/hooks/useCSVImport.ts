import { useCallback, useState } from "react";

import type { ColumnMapping } from "@packages/domain/csv/csvParser";
import { autoDetectMapping } from "@packages/domain/csv/csvParser";
import { type resources, useTranslation } from "@packages/i18n";

import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { syncEngine } from "../sync/syncEngine";
import { importValidatedLogs } from "./csvImportExecutor";
import {
  type CSVImportStep,
  CSV_TEMPLATE_CONTENT,
  type ValidatedActivityLog,
  buildValidatedLogs,
  createEmptyImportProgress,
  getValidationSummaryError,
  parseCSVFile,
  revalidateEditedLog,
  validateRequiredMapping,
} from "./csvImportUtils";

export type { ValidatedActivityLog };

type CsvTranslationKey = keyof (typeof resources)["ja"]["csv"];

export function useCSVImport(onComplete: () => void) {
  const { t } = useTranslation("csv");
  const translate = (key: string) => t(key as CsvTranslationKey);
  const [step, setStep] = useState<CSVImportStep>("file");
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
  const [progress, setProgress] = useState(createEmptyImportProgress());

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
    setProgress(createEmptyImportProgress());
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setImportSuccess(false);
  }, []);

  const handleParse = useCallback(async () => {
    if (!file) {
      return;
    }

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
  }, [file, t]);

  const handleMappingConfirm = useCallback(async () => {
    const mappingError = validateRequiredMapping(columnMapping, translate);
    if (mappingError) {
      setError(mappingError);
      return;
    }

    const [activities, allKinds] = await Promise.all([
      activityRepository.getAllActivities(),
      activityRepository.getAllActivityKinds(),
    ]);
    const nextValidatedLogs = buildValidatedLogs(
      parsedData,
      columnMapping,
      activities,
      allKinds,
    );

    setValidatedLogs(nextValidatedLogs);
    setStep("preview");
    setError(getValidationSummaryError(nextValidatedLogs, translate));
  }, [columnMapping, parsedData, translate]);

  const handleEdit = useCallback(
    async (index: number, field: keyof ValidatedActivityLog, value: string) => {
      const [activities, allKinds] = await Promise.all([
        activityRepository.getAllActivities(),
        activityRepository.getAllActivityKinds(),
      ]);

      setValidatedLogs((prev) => {
        const updated = [...prev];
        updated[index] = revalidateEditedLog(
          updated[index],
          field,
          value,
          columnMapping,
          activities,
          allKinds,
        );
        setError(getValidationSummaryError(updated, translate));
        return updated;
      });
    },
    [columnMapping, translate],
  );

  const handleRemove = useCallback((indices: number[]) => {
    setValidatedLogs((prev) =>
      prev.filter((_, index) => !indices.includes(index)),
    );
  }, []);

  const handleImport = useCallback(
    async (logs: ValidatedActivityLog[]) => {
      setIsImporting(true);
      setError(null);
      setProgress(createEmptyImportProgress());

      try {
        const result = await importValidatedLogs({
          logs,
          t: translate,
          onProgress: setProgress,
          activityRepository,
          activityLogRepository,
          syncEngine,
        });

        setImportSuccess(result.importSuccess);
        setError(result.errorMessage);

        if (result.autoCloseDelayMs !== null) {
          setTimeout(() => {
            onComplete();
            reset();
          }, result.autoCloseDelayMs);
        }
      } finally {
        setIsImporting(false);
      }
    },
    [onComplete, reset, translate],
  );

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
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
