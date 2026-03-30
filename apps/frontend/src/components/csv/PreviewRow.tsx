import { useTranslation } from "@packages/i18n";

import { useActivityKinds } from "../../hooks/useActivityKinds";
import type { ValidatedActivityLog } from "../../hooks/useCSVImport";

export function PreviewRow({
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
  const { t } = useTranslation("csv");
  const selectedActivity = activities.find((a) => a.name === log.activityName);
  const { kinds } = useActivityKinds(selectedActivity?.id ?? null);

  return (
    <tr
      className={`border-b last:border-0 ${status === "error" ? "bg-red-50" : ""}`}
    >
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
            <option value="_new">{t("newActivityLabel")}</option>
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
                onChange={(e) => onEdit(index, "activityName", e.target.value)}
                placeholder={t("newActivityPlaceholder")}
                className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                disabled={isImporting}
              />
            )}
          {log.isNewActivity && log.activityName && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
              {t("newActivityBadge")}
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
            <option value="_none">{t("noKind")}</option>
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
            placeholder={!selectedActivity ? "-" : t("noKind")}
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
