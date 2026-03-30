import { useTranslation } from "@packages/i18n";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  XCircle,
} from "lucide-react";

import { useActivities } from "../../hooks/useActivities";
import type { ValidatedActivityLog } from "../../hooks/useCSVImport";
import { PreviewRow } from "./PreviewRow";
import { useCSVImportPreview } from "./useCSVImportPreview";

type Props = {
  validatedLogs: ValidatedActivityLog[];
  onEdit: (
    index: number,
    field: keyof ValidatedActivityLog,
    value: string,
  ) => void;
  onRemove: (indices: number[]) => void;
  onImport: (logs: ValidatedActivityLog[]) => void;
  isImporting?: boolean;
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
}

export function CSVImportPreview({
  validatedLogs,
  onEdit,
  onRemove,
  onImport,
  isImporting = false,
}: Props) {
  const { t } = useTranslation("csv");
  const { activities } = useActivities();
  const {
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
  } = useCSVImportPreview(validatedLogs);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 items-center flex-wrap">
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          {t("statsTotal")}: {stats.total}
        </span>
        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          {t("statsValid")}: {stats.valid}
        </span>
        {stats.warnings > 0 && (
          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            {t("statsNewActivities")}: {stats.warnings}
          </span>
        )}
        {stats.errors > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            {t("statsErrors")}: {stats.errors}
          </span>
        )}
        {stats.errors > 0 && (
          <button
            type="button"
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showErrorsOnly ? t("filterShowAll") : t("filterErrorsOnly")}
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleRemoveSelected(onRemove)}
            disabled={selectedIndices.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("deleteSelected")} ({selectedIndices.size})
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={validatedLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportCorrected")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {stats.errors > 0 && (
            <span className="text-xs text-orange-600">
              {t("errorSkipMessage")}
            </span>
          )}
          <button
            type="button"
            onClick={() => onImport(validatedLogs)}
            disabled={isImporting || stats.valid === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
              isImporting || stats.valid === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isImporting
              ? `${t("exporting")}`
              : `${t("importButton")} (${stats.valid})`}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={
                    selectedIndices.size === validatedLogs.length &&
                    validatedLogs.length > 0
                  }
                  onChange={toggleAll}
                  className="h-4 w-4 accent-blue-600"
                />
              </th>
              <th className="w-10 px-2 py-2">{t("tableStatus")}</th>
              <th className="px-3 py-2 text-left">{t("tableDate")}</th>
              <th className="px-3 py-2 text-left">{t("tableActivity")}</th>
              <th className="px-3 py-2 text-left">{t("tableKind")}</th>
              <th className="px-3 py-2 text-left">{t("tableQuantity")}</th>
              <th className="px-3 py-2 text-left">{t("tableMemo")}</th>
              <th className="px-3 py-2 text-left">{t("tableError")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, idx) => {
              const originalIndex = validatedLogs.indexOf(log);
              const status = getRowStatus(log);
              return (
                <PreviewRow
                  key={`${log.date}-${log.activityName}-${log.quantity}-${idx}`}
                  log={log}
                  index={originalIndex}
                  status={status}
                  isSelected={selectedIndices.has(originalIndex)}
                  onToggleSelect={() => toggleSelection(originalIndex)}
                  onEdit={onEdit}
                  isImporting={isImporting}
                  activities={activities}
                  statusIcon={<StatusIcon status={status} />}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
