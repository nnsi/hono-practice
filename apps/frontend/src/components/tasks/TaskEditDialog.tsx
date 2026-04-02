import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import { DatePickerField } from "../common/DatePickerField";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { TaskActivityFields } from "./TaskActivityFields";
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
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("edit.placeholder.title")}
              disabled={isArchived}
            />
          </div>

          <TaskActivityFields
            activityId={activityId}
            setActivityId={setActivityId}
            activityKindId={activityKindId}
            setActivityKindId={setActivityKindId}
            quantity={quantity}
            setQuantity={setQuantity}
            disabled={isArchived}
          />

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
            <FormTextarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("edit.placeholder.memo")}
              rows={3}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <FormButton
              variant="danger"
              label={t("edit.delete")}
              onClick={() => onDelete(task.id)}
              className="px-4"
            />
            <div className="flex-1" />
            <FormButton
              variant="secondary"
              label={t("delete.cancel")}
              onClick={onClose}
              className="px-4"
            />
            <FormButton
              type="submit"
              variant="primary"
              label={isSubmitting ? t("edit.submitting") : t("edit.submit")}
              disabled={isSubmitting || !title.trim()}
              className="px-4"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
