import { useMemo, useState } from "react";

import { getToday } from "@packages/frontend-shared/utils/dateUtils";

import type { ValidatedActivityLog } from "../../hooks/useCSVImport";

export function useCSVImportPreview(validatedLogs: ValidatedActivityLog[]) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const stats = useMemo(() => {
    const total = validatedLogs.length;
    const errors = validatedLogs.filter((l) => l.errors.length > 0).length;
    const warnings = validatedLogs.filter(
      (l) => l.isNewActivity && l.errors.length === 0,
    ).length;
    const valid = total - errors;
    return { total, errors, warnings, valid };
  }, [validatedLogs]);

  const toggleSelection = (index: number) => {
    const s = new Set(selectedIndices);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    setSelectedIndices(s);
  };

  const toggleAll = () => {
    if (selectedIndices.size === validatedLogs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(validatedLogs.map((_, i) => i)));
    }
  };

  const handleRemoveSelected = (onRemove: (indices: number[]) => void) => {
    onRemove(Array.from(selectedIndices));
    setSelectedIndices(new Set());
  };

  const handleExportCsv = () => {
    const headers = ["date", "activity", "kind", "quantity", "memo"];
    const csvContent = [
      headers.join(","),
      ...validatedLogs.map((log) => {
        const row = [
          log.date,
          log.activityName,
          log.kindName || "",
          log.quantity.toString(),
          log.memo || "",
        ];
        return row
          .map((f) => {
            if (f.includes(",") || f.includes('"') || f.includes("\n")) {
              return `"${f.replace(/"/g, '""')}"`;
            }
            return f;
          })
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity_logs_${getToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRowStatus = (log: ValidatedActivityLog) => {
    if (log.errors.length > 0) return "error";
    if (log.isNewActivity) return "warning";
    return "success";
  };

  const filteredLogs = useMemo(() => {
    if (!showErrorsOnly) return validatedLogs;
    return validatedLogs.filter((l) => l.errors.length > 0);
  }, [validatedLogs, showErrorsOnly]);

  return {
    selectedIndices,
    showErrorsOnly,
    setShowErrorsOnly,
    stats,
    toggleSelection,
    toggleAll,
    handleRemoveSelected,
    handleExportCsv,
    getRowStatus,
    filteredLogs,
  };
}
