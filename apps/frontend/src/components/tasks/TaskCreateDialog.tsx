import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";

import { db } from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { DatePickerField } from "../common/DatePickerField";
import { ModalOverlay } from "../common/ModalOverlay";
import { useTaskCreateDialog } from "./useTaskCreateDialog";

export function TaskCreateDialog({
  onClose,
  onSuccess,
  defaultDate,
}: {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
}) {
  const {
    title,
    setTitle,
    activityId,
    setActivityId,
    activityKindId,
    setActivityKindId,
    quantity,
    setQuantity,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    memo,
    setMemo,
    isSubmitting,
    handleSubmit,
  } = useTaskCreateDialog(onSuccess, defaultDate);
  const { activities } = useActivities();

  const selectedActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : undefined;

  const activityKinds =
    useLiveQuery(
      () =>
        activityId
          ? db.activityKinds
              .where("activityId")
              .equals(activityId)
              .filter((k) => !k.deletedAt)
              .toArray()
          : [],
      [activityId],
    ) ?? [];

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新しいタスクを作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトルを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* アクティビティ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アクティビティ（任意）
            </label>
            <select
              value={activityId ?? ""}
              onChange={(e) => {
                setActivityId(e.target.value || null);
                setActivityKindId(null);
                setQuantity(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">なし</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* ActivityKind選択 */}
          {activityId && activityKinds && activityKinds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                種類（任意）
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActivityKindId(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activityKindId === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  なし
                </button>
                {activityKinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => setActivityKindId(kind.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activityKindId === kind.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={
                      activityKindId === kind.id && kind.color
                        ? { backgroundColor: kind.color, color: "#fff" }
                        : kind.color
                          ? { borderColor: kind.color, borderWidth: 1 }
                          : undefined
                    }
                  >
                    {kind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量 */}
          {activityId && selectedActivity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
                {selectedActivity.quantityUnit && (
                  <span className="ml-1 text-gray-500">
                    ({selectedActivity.quantityUnit})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="any"
                value={quantity ?? ""}
                onChange={(e) =>
                  setQuantity(
                    e.target.value !== "" ? Number(e.target.value) : null,
                  )
                }
                placeholder="数量を入力（任意）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <DatePickerField value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限（任意）
              </label>
              <DatePickerField
                value={dueDate}
                onChange={setDueDate}
                placeholder="未設定"
                allowClear
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
              placeholder="タスクに関するメモを入力"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
