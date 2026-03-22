import { Pencil, PlusCircle, Trash2 } from "lucide-react";

export function GoalCardActions({
  isPast,
  goalIsActive,
  showDeleteConfirm,
  deleting,
  onRecordOpen,
  onEditStart,
  onDeactivate,
  onDeleteConfirm,
  onDeleteCancel,
  onHandleDelete,
}: {
  isPast: boolean;
  goalIsActive: boolean;
  showDeleteConfirm: boolean;
  deleting: boolean;
  onRecordOpen?: () => void;
  onEditStart: () => void;
  onDeactivate?: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onHandleDelete: () => void;
}) {
  return (
    <>
      {!isPast && onRecordOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRecordOpen();
          }}
          className="p-1 hover:bg-blue-100 rounded-md transition-colors"
          title="活動を記録"
        >
          <PlusCircle size={14} className="text-blue-500" />
        </button>
      )}
      {!isPast && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditStart();
          }}
          className="p-1 hover:bg-gray-200 rounded-md transition-colors"
        >
          <Pencil size={14} className="text-gray-400" />
        </button>
      )}
      {isPast && goalIsActive && onDeactivate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeactivate();
          }}
          className="px-2 py-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors"
        >
          終了する
        </button>
      )}
      {isPast && !showDeleteConfirm && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConfirm();
          }}
          className="p-1 hover:bg-gray-200 rounded-md transition-colors"
        >
          <Trash2 size={14} className="text-gray-400" />
        </button>
      )}
      {isPast && showDeleteConfirm && (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onHandleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            削除
          </button>
          <button
            type="button"
            onClick={onDeleteCancel}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      )}
    </>
  );
}
