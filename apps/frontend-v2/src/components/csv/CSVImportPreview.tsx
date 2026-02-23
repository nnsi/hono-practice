import { useMemo, useState } from "react";
import { useActivities } from "../../hooks/useActivities";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import type { ValidatedActivityLog } from "../../hooks/useCSVImport";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  XCircle,
} from "lucide-react";

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

export function CSVImportPreview({
  validatedLogs,
  onEdit,
  onRemove,
  onImport,
  isImporting = false,
}: Props) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const { activities } = useActivities();

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

  const handleRemoveSelected = () => {
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
    link.download = `activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRowStatus = (log: ValidatedActivityLog) => {
    if (log.errors.length > 0) return "error";
    if (log.isNewActivity) return "warning";
    return "success";
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const filteredLogs = useMemo(() => {
    if (!showErrorsOnly) return validatedLogs;
    return validatedLogs.filter((l) => l.errors.length > 0);
  }, [validatedLogs, showErrorsOnly]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 items-center flex-wrap">
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          合計: {stats.total}件
        </span>
        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          正常: {stats.valid}件
        </span>
        {stats.warnings > 0 && (
          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            新規アクティビティ: {stats.warnings}件
          </span>
        )}
        {stats.errors > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            エラー: {stats.errors}件
          </span>
        )}
        {stats.errors > 0 && (
          <button
            type="button"
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showErrorsOnly ? "全て表示" : "エラーのみ表示"}
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRemoveSelected}
            disabled={selectedIndices.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            選択した行を削除 ({selectedIndices.size})
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={validatedLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            修正済みCSV
          </button>
        </div>

        <div className="flex items-center gap-2">
          {stats.errors > 0 && (
            <span className="text-xs text-orange-600">
              エラーがある行はスキップされます
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
              ? "インポート中..."
              : `インポート (${stats.valid}件)`}
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
              <th className="w-10 px-2 py-2">状態</th>
              <th className="px-3 py-2 text-left">日付</th>
              <th className="px-3 py-2 text-left">アクティビティ</th>
              <th className="px-3 py-2 text-left">種別</th>
              <th className="px-3 py-2 text-left">数量</th>
              <th className="px-3 py-2 text-left">メモ</th>
              <th className="px-3 py-2 text-left">エラー</th>
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

function PreviewRow({
  log,
  index,
  status,
  isSelected,
  onToggleSelect,
  onEdit,
  isImporting,
  activities,
  statusIcon,
}: {
  log: ValidatedActivityLog;
  index: number;
  status: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: (
    index: number,
    field: keyof ValidatedActivityLog,
    value: string,
  ) => void;
  isImporting: boolean;
  activities: { id: string; name: string; emoji: string }[];
  statusIcon: React.ReactNode;
}) {
  const selectedActivity = activities.find((a) => a.name === log.activityName);
  const { kinds } = useActivityKinds(selectedActivity?.id ?? null);

  return (
    <tr className={`border-b last:border-0 ${status === "error" ? "bg-red-50" : ""}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 accent-blue-600"
        />
      </td>
      <td className="px-2 py-2">{statusIcon}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={log.date}
          onChange={(e) => onEdit(index, "date", e.target.value)}
          className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
          disabled={isImporting}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <select
            value={log.activityName || "_new"}
            onChange={(e) =>
              onEdit(
                index,
                "activityName",
                e.target.value === "_new" ? "" : e.target.value,
              )
            }
            disabled={isImporting}
            className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="_new">新規作成...</option>
            {activities.map((a) => (
              <option key={a.id} value={a.name}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
          {log.activityName &&
            !activities.find((a) => a.name === log.activityName) && (
              <input
                type="text"
                value={log.activityName}
                onChange={(e) =>
                  onEdit(index, "activityName", e.target.value)
                }
                placeholder="新規名"
                className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                disabled={isImporting}
              />
            )}
          {log.isNewActivity && log.activityName && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
              新規
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        {selectedActivity && kinds.length > 0 ? (
          <select
            value={log.kindName || "_none"}
            onChange={(e) =>
              onEdit(
                index,
                "kindName",
                e.target.value === "_none" ? "" : e.target.value,
              )
            }
            disabled={isImporting}
            className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="_none">種別なし</option>
            {kinds.map((k) => (
              <option key={k.id} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={log.kindName || ""}
            onChange={(e) => onEdit(index, "kindName", e.target.value)}
            className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
            disabled={isImporting || !selectedActivity}
            placeholder={!selectedActivity ? "-" : "種別なし"}
          />
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={log.quantity}
          onChange={(e) => onEdit(index, "quantity", e.target.value)}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
          disabled={isImporting}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={log.memo || ""}
          onChange={(e) => onEdit(index, "memo", e.target.value)}
          className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
          disabled={isImporting}
        />
      </td>
      <td className="px-3 py-2">
        {log.errors.length > 0 && (
          <div className="text-xs text-red-600">
            {log.errors.map((err, i) => (
              <div key={`err-${i}-${err.message}`}>{err.message}</div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
