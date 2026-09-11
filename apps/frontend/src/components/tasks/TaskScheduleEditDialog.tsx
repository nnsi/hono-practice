import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { useTranslation } from "@packages/i18n";
import { VALIDATION as V } from "@packages/types/validation";
import { X } from "lucide-react";

import { DatePickerField } from "../common/DatePickerField";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { TaskActivityFields } from "./TaskActivityFields";
import { TaskRecurrenceFields } from "./TaskRecurrenceFields";
import { useTaskScheduleEditDialog } from "./useTaskScheduleEditDialog";

export function TaskScheduleEditDialog({
  schedule,
  onClose,
  onSuccess,
}: {
  schedule: TaskScheduleRecord;
  onClose: () => void;
  onSuccess: () => void;
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
    recurrenceType,
    setRecurrenceType,
    intervalDays,
    setIntervalDays,
    weekdays,
    toggleWeekday,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    memo,
    setMemo,
    recurrenceError,
    canSubmit,
    isSubmitting,
    handleSubmit,
  } = useTaskScheduleEditDialog(schedule, onSuccess);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("schedules.edit.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t("delete.cancel")}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.title")} <span className="text-red-500">*</span>
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={V.TASK_TITLE_MAX}
              placeholder={t("edit.placeholder.title")}
              aria-label={t("create.label.title")}
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

          <TaskRecurrenceFields
            recurrenceType={recurrenceType}
            setRecurrenceType={setRecurrenceType}
            intervalDays={intervalDays}
            setIntervalDays={setIntervalDays}
            weekdays={weekdays}
            toggleWeekday={toggleWeekday}
            error={recurrenceError}
            hideNone
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("create.label.startDate")}
              </label>
              <DatePickerField value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("create.label.endDate")}
              </label>
              <DatePickerField
                value={endDate}
                onChange={setEndDate}
                placeholder={t("create.placeholder.dueDate")}
                allowClear
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.memo")}
            </label>
            <FormTextarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("edit.placeholder.memo")}
              maxLength={V.MEMO_MAX}
              rows={3}
              aria-label={t("create.label.memo")}
            />
          </div>

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
              label={isSubmitting ? t("edit.submitting") : t("edit.submit")}
              disabled={!canSubmit}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
