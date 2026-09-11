import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { useTranslation } from "@packages/i18n";
import { VALIDATION as V } from "@packages/types/validation";
import { Text, View } from "react-native";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { activityRepository } from "../../repositories/activityRepository";
import { mobileTestIds } from "../../testing/testIds";
import { DatePickerField } from "../common/DatePickerField";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { TaskActivityPicker } from "./TaskActivityPicker";
import { TaskQuantityField } from "./TaskQuantityField";
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
    handleSave,
  } = useTaskScheduleEditDialog(schedule, onSuccess);

  const { activities } = useActivities();
  const iconBlobMap = useIconBlobMap();
  const kinds = useLiveQuery(
    "activity_kinds",
    () =>
      activityId
        ? activityRepository.getActivityKindsByActivityId(activityId)
        : Promise.resolve([]),
    [activityId],
  );
  const selectedActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;
  const handleSetActivityId = (id: string | null) => {
    setActivityId(id);
    setActivityKindId(null);
    setQuantity(null);
  };

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title={t("schedules.edit.title")}
      testID={mobileTestIds.tasks.scheduleEditDialog}
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="secondary"
            label={t("delete.cancel")}
            onPress={onClose}
            className="flex-1"
          />
          <FormButton
            variant="primary"
            label={isSubmitting ? t("edit.submitting") : t("edit.submit")}
            onPress={handleSave}
            disabled={!canSubmit}
            className="flex-1"
            testID={mobileTestIds.tasks.scheduleEditSaveButton}
          />
        </View>
      }
    >
      <View className="gap-4 pb-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.title")}{" "}
            <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <FormInput
            value={title}
            onChangeText={setTitle}
            maxLength={V.TASK_TITLE_MAX}
            placeholder={t("edit.placeholder.title")}
            accessibilityLabel={t("create.label.title")}
            testID={mobileTestIds.tasks.scheduleEditTitleInput}
          />
        </View>

        <TaskActivityPicker
          activities={activities}
          iconBlobMap={iconBlobMap}
          activityId={activityId}
          onActivityIdChange={handleSetActivityId}
          kinds={kinds ?? []}
          activityKindId={activityKindId}
          onActivityKindIdChange={setActivityKindId}
        />

        {activityId && (
          <TaskQuantityField
            quantity={quantity}
            setQuantity={setQuantity}
            quantityUnit={selectedActivity?.quantityUnit}
          />
        )}

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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <DatePickerField
              value={startDate}
              onChange={setStartDate}
              label={t("create.label.startDate")}
            />
          </View>
          <View className="flex-1">
            <OptionalDatePickerField
              value={endDate}
              onChange={setEndDate}
              label={t("create.label.endDate")}
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.memo")}
          </Text>
          <FormTextarea
            value={memo}
            onChangeText={setMemo}
            placeholder={t("edit.placeholder.memo")}
            maxLength={V.MEMO_MAX}
            numberOfLines={3}
            style={{ textAlignVertical: "top" }}
            accessibilityLabel={t("create.label.memo")}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
