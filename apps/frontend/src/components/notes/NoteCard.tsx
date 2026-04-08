import type { SyncStatus } from "@packages/domain/sync/syncableRecord";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Loader2, Trash2 } from "lucide-react";

export function NoteCard({
  title,
  content,
  updatedAt,
  activityName,
  syncStatus,
  onClick,
  onDelete,
}: {
  title: string;
  content: string;
  updatedAt: string;
  activityName: string | null;
  syncStatus?: SyncStatus;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("note");
  const preview = content.length > 50 ? `${content.slice(0, 50)}...` : content;
  const formattedDate = dayjs(updatedAt).format("YYYY/MM/DD HH:mm");
  const isPending = syncStatus === "pending";

  return (
    <div className="flex items-start justify-between gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h3>
          {isPending && (
            <Loader2
              size={14}
              className="text-orange-500 animate-spin shrink-0"
            />
          )}
        </div>
        {preview && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {preview}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formattedDate}
          </p>
          {activityName && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {activityName}
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onDelete}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          aria-label={t("edit.deleteNote")}
        >
          <Trash2 size={16} className="text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    </div>
  );
}
