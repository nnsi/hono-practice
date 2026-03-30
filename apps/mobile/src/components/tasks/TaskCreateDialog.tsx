import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { activityRepository } from "../../repositories/activityRepository";
import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { TaskActivityPicker } from "./TaskActivityPicker";
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
    handleCreate,
  } = useTaskCreateDialog(onSuccess, defaultDate);

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
      title={t("create.title")}
      footer={
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg items-center"
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t("delete.cancel")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isSubmitting || !title.trim()}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              isSubmitting || !title.trim() ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            <Text className="text-sm text-white font-medium">
              {isSubmitting ? t("create.submitting") : t("create.submit")}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="gap-4 pb-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.title")}{" "}
            <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <IMESafeTextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("create.placeholder.title")}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            autoFocus
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
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            />
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <DatePickerField
              value={startDate || getToday()}
              onChange={setStartDate}
              label={t("create.label.startDate")}
            />
          </View>
          <View className="flex-1">
            <OptionalDatePickerField
              value={dueDate}
              onChange={setDueDate}
              label={t("create.label.dueDate")}
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
            placeholder={t("create.placeholder.memo")}
            multiline
            numberOfLines={3}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
            style={{ textAlignVertical: "top" }}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
