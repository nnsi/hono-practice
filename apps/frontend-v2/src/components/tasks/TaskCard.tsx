import dayjs from "dayjs";
import {
  CheckCircle2,
  Circle,
  Archive,
  CalendarCheck,
  Pencil,
  Trash2,
  CalendarDays,
  FileText,
} from "lucide-react";
import type { TaskItem } from "./types";

export function TaskCard({
  task,
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: {
  task: TaskItem;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveToToday?: () => void;
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const showMoveToToday =
    !archived && !task.doneDate && task.startDate !== today && onMoveToToday;
  return (
    <div
      className={`
        flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200
        ${highlight ? "border border-red-200 bg-red-50/80" : "bg-white shadow-soft border border-gray-200/50"}
        ${!completed && !archived ? "hover:shadow-lifted" : ""}
        ${completed ? "opacity-70" : ""}
      `}
    >
      {/* チェックボックス */}
      {!archived && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={task.doneDate ? "未完了に戻す" : "完了にする"}
        >
          {task.doneDate ? (
            <CheckCircle2 size={22} className="text-green-500" />
          ) : (
            <Circle size={22} className="text-gray-400" />
          )}
        </button>
      )}

      {/* タスク本体 */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div
          className={`text-sm font-medium truncate ${
            completed || task.doneDate
              ? "line-through text-gray-500"
              : "text-gray-900"
          }`}
        >
          {task.title}
        </div>
        {(task.startDate || task.dueDate) && (
          <div className="flex items-center gap-1 mt-0.5">
            <CalendarDays size={12} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {task.startDate &&
                `${dayjs(task.startDate).format("MM/DD")}`}
              {task.startDate && task.dueDate && " - "}
              {task.dueDate &&
                `${dayjs(task.dueDate).format("MM/DD")}`}
            </span>
            {task.doneDate && (
              <span className="text-xs text-green-600 ml-2">
                完了: {dayjs(task.doneDate).format("MM/DD")}
              </span>
            )}
          </div>
        )}
        {task.memo && (
          <div className="flex items-center gap-1 mt-0.5">
            <FileText size={12} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate">{task.memo}</span>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* 今日に移動ボタン */}
        {showMoveToToday && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToToday();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="今日に移動"
          >
            <CalendarCheck size={16} />
          </button>
        )}
        {/* 完了済みタスクのアーカイブボタン */}
        {task.doneDate && !archived && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="アーカイブ"
          >
            <Archive size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="編集"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="削除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
