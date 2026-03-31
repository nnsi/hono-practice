import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Text, View } from "react-native";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { activityRepository } from "../../repositories/activityRepository";
import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { TaskActivityPicker } from "./TaskActivityPicker";
import { TaskEditDialogFooter } from "./TaskEditDialogFooter";
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
    handleSave,
  } = useTaskEditDialog(task, onSuccess);

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
      title={t("edit.title")}
      footer={
        <TaskEditDialogFooter
          taskId={task.id}
          title={title}
          isSubmitting={isSubmitting}
          onDelete={onDelete}
          onClose={onClose}
          onSave={handleSave}
        />
      }
    >
      <View className="gap-4 pb-4">
        {isArchived && (
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            アーカイブ済みタスクはメモの編集と削除のみ可能です
          </Text>
        )}

        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.title")}
          </Text>
          <IMESafeTextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("edit.placeholder.title")}
            editable={!isArchived}
            className={`border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base ${
              isArchived
                ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                : "text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            }`}
            accessibilityLabel={t("create.label.title")}
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
          disabled={isArchived}
        />

        {activityId && (
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              数量（任意）
              {selectedActivity?.quantityUnit
                ? `（${selectedActivity.quantityUnit}）`
                : ""}
            </Text>
            <IMESafeTextInput
              value={quantity !== null ? String(quantity) : ""}
              onChangeText={(v) => {
                const parsed = parseFloat(v);
                setQuantity(
                  v === "" ? null : Number.isNaN(parsed) ? null : parsed,
                );
              }}
              placeholder={t("create.placeholder.quantityMobile")}
              keyboardType="decimal-pad"
              editable={!isArchived}
              className={`border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base ${
                isArchived
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  : "text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              }`}
            />
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1">
            {isArchived ? (
              <View>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {t("create.label.startDate")}
                </Text>
                <Text className="text-sm text-gray-400 dark:text-gray-500 px-3 py-2">
                  {startDate ? dayjs(startDate).format("YYYY/MM/DD") : "未設定"}
                </Text>
              </View>
            ) : (
              <DatePickerField
                value={startDate || getToday()}
                onChange={setStartDate}
                label={t("create.label.startDate")}
              />
            )}
          </View>
          <View className="flex-1">
            <OptionalDatePickerField
              value={dueDate}
              onChange={setDueDate}
              label={t("create.label.dueDate")}
              disabled={isArchived}
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.memo")}
          </Text>
          <IMESafeTextInput
            value={memo}
            onChangeText={setMemo}
            placeholder={t("edit.placeholder.memo")}
            multiline
            numberOfLines={3}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            style={{ textAlignVertical: "top" }}
            accessibilityLabel={t("create.label.memo")}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
