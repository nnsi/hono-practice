import { Loader2 } from "lucide-react";
import type {
  DexieActivity,
  DexieActivityLog,
  DexieActivityKind,
} from "../../db/schema";

export function LogCard({
  log,
  activity,
  kind,
  onClick,
}: {
  log: DexieActivityLog;
  activity: DexieActivity | null;
  kind: DexieActivityKind | null;
  onClick: () => void;
}) {
  const isPending = log._syncStatus === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] press-effect text-left ${
        isPending
          ? "border border-amber-200 bg-amber-50/50 shadow-soft"
          : "bg-white shadow-soft hover:shadow-lifted border border-gray-200/50"
      }`}
    >
      {/* アイコン */}
      <span className="flex items-center justify-center w-10 h-10 text-2xl shrink-0">
        {activity ? (
          activity.iconType === "upload" && activity.iconThumbnailUrl ? (
            <img
              src={activity.iconThumbnailUrl}
              alt={activity.name}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            activity.emoji || "📝"
          )
        ) : (
          "📝"
        )}
      </span>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-base truncate">
            {activity?.name ?? "不明"}
          </span>
          {kind && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
              {kind.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: kind.color }}
                />
              )}
              {kind.name}
            </span>
          )}
          {isPending && (
            <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
          )}
        </div>
        <div className="text-sm text-gray-500">
          {log.quantity !== null
            ? `${log.quantity}${activity?.quantityUnit ?? ""}`
            : "-"}
        </div>
        {log.memo && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">
            {log.memo}
          </div>
        )}
      </div>
    </button>
  );
}
