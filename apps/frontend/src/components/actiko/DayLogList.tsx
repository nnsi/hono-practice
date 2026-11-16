import type { ActivityLogBase } from "@packages/frontend-shared/hooks/types";
import { formatQuantityWithUnit } from "@packages/frontend-shared/utils";
import { useTranslation } from "@packages/i18n";
import { Loader2 } from "lucide-react";

import type { DexieActivity, DexieActivityKind } from "../../db/schema";

/** その日の記録を 1 行ずつ詰めて並べる（グリッドの下に置くため、Daily の LogCard より低い行にする） */
export function DayLogList({
  logs,
  activitiesMap,
  kindsMap,
  onSelect,
}: {
  logs: ActivityLogBase[];
  activitiesMap: Map<string, DexieActivity>;
  kindsMap: Map<string, DexieActivityKind>;
  onSelect: (log: ActivityLogBase) => void;
}) {
  const { t } = useTranslation("activity");

  if (logs.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-4">
        {t("daily.noRecords")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white shadow-soft divide-y divide-gray-100 overflow-hidden">
      {logs.map((log) => {
        const activity = activitiesMap.get(log.activityId);
        const kind = log.activityKindId
          ? kindsMap.get(log.activityKindId)
          : undefined;
        const isPending = log._syncStatus === "pending";
        return (
          <button
            key={log.id}
            type="button"
            onClick={() => onSelect(log)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 ${
              activity?.deletedAt ? "opacity-50" : ""
            } ${isPending ? "bg-amber-50/60" : ""}`}
          >
            <span className="flex items-center justify-center w-6 h-6 text-lg leading-none shrink-0">
              {activity?.iconType === "upload" && activity.iconThumbnailUrl ? (
                <img
                  src={activity.iconThumbnailUrl}
                  alt=""
                  className="w-6 h-6 object-cover rounded"
                />
              ) : (
                activity?.emoji || "📝"
              )}
            </span>
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-800 truncate shrink-0 max-w-[55%]">
                {activity?.name ?? t("log.unknownActivity")}
              </span>
              {kind && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  {kind.color && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: kind.color }}
                    />
                  )}
                  {kind.name}
                </span>
              )}
              {log.memo && (
                <span className="text-xs text-gray-400 truncate">
                  {log.memo}
                </span>
              )}
            </span>
            {isPending && (
              <Loader2
                size={13}
                className="text-orange-500 animate-spin shrink-0"
              />
            )}
            <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
              {log.quantity !== null
                ? formatQuantityWithUnit(
                    log.quantity,
                    activity?.quantityUnit ?? "",
                  )
                : "-"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
