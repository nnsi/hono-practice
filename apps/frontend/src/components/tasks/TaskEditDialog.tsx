import { useTranslation } from "@packages/i18n";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";

import { db } from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { DatePickerField } from "../common/DatePickerField";
import { ModalOverlay } from "../common/ModalOverlay";
import type { TaskItem } from "./types";
import { useTaskEditDialog } from "./useTaskEditDialog";

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
  const { t } = useTranslation("task");
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
    isArchived,
    handleSubmit,
  } = useTaskEditDialog(task, onSuccess);
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
          <h2 className="text-lg font-bold">{t("edit.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {isArchived && (
          <p className="text-xs text-gray-500 mb-3">{t("edit.warning")}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.title")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("edit.placeholder.title")}
              disabled={isArchived}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* アクティビティ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.activity")}
            </label>
            <select
              value={activityId ?? ""}
              onChange={(e) => {
                setActivityId(e.target.value || null);
                setActivityKindId(null);
                setQuantity(null);
              }}
              disabled={isArchived}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">{t("create.none")}</option>
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
                {t("create.label.kind")}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isArchived}
                  onClick={() => setActivityKindId(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                    activityKindId === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t("create.none")}
                </button>
                {activityKinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    disabled={isArchived}
                    onClick={() => setActivityKindId(kind.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
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
                {t("create.label.quantity")}
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
                placeholder={t("create.placeholder.quantity")}
                disabled={isArchived}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          )}

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("create.label.startDate")}
              </label>
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                disabled={isArchived}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("create.label.dueDate")}
              </label>
              <DatePickerField
                value={dueDate}
                onChange={setDueDate}
                placeholder={t("create.placeholder.dueDate")}
                allowClear
                disabled={isArchived}
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.memo")}
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("edit.placeholder.memo")}
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
              {t("edit.delete")}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("delete.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? t("edit.submitting") : t("edit.submit")}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
