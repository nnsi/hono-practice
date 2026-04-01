import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import { DatePickerField } from "../common/DatePickerField";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { TaskActivityFields } from "./TaskActivityFields";
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
    handleSubmit,
  } = useTaskCreateDialog(onSuccess, defaultDate);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("create.title")}</h2>
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
              {t("create.label.title")} <span className="text-red-500">*</span>
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("create.placeholder.title")}
            />
          </div>

          <TaskActivityFields
            activityId={activityId}
            setActivityId={setActivityId}
            activityKindId={activityKindId}
            setActivityKindId={setActivityKindId}
            quantity={quantity}
            setQuantity={setQuantity}
          />

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("create.label.startDate")}
              </label>
              <DatePickerField value={startDate} onChange={setStartDate} />
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
              placeholder={t("create.placeholder.memo")}
              rows={3}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <FormButton
              variant="secondary"
              label={t("delete.cancel")}
              onClick={onClose}
              className="flex-1"
            />
            <FormButton
              type="submit"
              variant="primary"
              label={isSubmitting ? t("create.submitting") : t("create.submit")}
              disabled={isSubmitting || !title.trim()}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
