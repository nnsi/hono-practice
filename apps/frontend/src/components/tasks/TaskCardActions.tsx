import type { MouseEvent } from "react";

import { useTranslation } from "@packages/i18n";
import { Archive, CalendarCheck, Pencil, Trash2 } from "lucide-react";

type Props = {
  showMoveToToday: boolean;
  showArchive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveToToday?: () => void;
};

const stop = (handler: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
  e.stopPropagation();
  handler();
};

export function TaskCardActions({
  showMoveToToday,
  showArchive,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: Props) {
  const { t } = useTranslation("task");
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {showMoveToToday && onMoveToToday && (
        <button
          type="button"
          onClick={stop(onMoveToToday)}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title={t("card.moveToToday")}
        >
          <CalendarCheck size={16} />
        </button>
      )}
      {showArchive && (
        <button
          type="button"
          onClick={stop(onArchive)}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title={t("card.archive")}
        >
          <Archive size={16} />
        </button>
      )}
      <button
        type="button"
        onClick={stop(onEdit)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title={t("card.edit")}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={stop(onDelete)}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title={t("card.delete")}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
