import { useState } from "react";
import { X } from "lucide-react";
import { ModalOverlay } from "../common/ModalOverlay";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { TaskItem } from "./types";

export function TaskEditDialog({
  task,
  onClose,
  onSuccess,
  onDelete,
}: {
  task: TaskItem;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.startDate || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [memo, setMemo] = useState(task.memo || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isArchived = !!task.archivedAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    await taskRepository.updateTask(task.id, {
      title: title.trim(),
      startDate: startDate || null,
      dueDate: dueDate || null,
      memo: memo.trim(),
    });
    setIsSubmitting(false);
    syncEngine.syncTasks();
    onSuccess();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">タスクを編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {isArchived && (
          <p className="text-xs text-gray-500 mb-3">
            アーカイブ済みタスクはメモの編集と削除のみ可能です
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトル"
              disabled={isArchived}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              autoFocus
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isArchived}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限（任意）
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isArchived}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="タスクに関するメモ"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              削除
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
