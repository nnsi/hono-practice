import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { formatScheduleDateRange } from "@packages/frontend-shared/hooks/taskScheduleSummary";
import { useTranslation } from "@packages/i18n";
import { CalendarDays, Pause, Play, Repeat, Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { mobileTestIds } from "../../testing/testIds";
import { ActivityIcon } from "../common/ActivityIcon";
import { useRecurrenceSummary } from "./useRecurrenceSummary";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type Props = {
  schedule: TaskScheduleRecord;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

export function TaskScheduleRow({
  schedule,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const { t } = useTranslation("task");
  const summarize = useRecurrenceSummary();
  const { activities } = useActivities();
  const iconBlobMap = useIconBlobMap();
  const linkedActivity = schedule.activityId
    ? activities.find((a) => a.id === schedule.activityId)
    : undefined;
  const range = formatScheduleDateRange(schedule);
  const paused = !schedule.isActive;

  return (
    <View
      className={`flex-row items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 ${
        paused ? "opacity-60" : ""
      }`}
      style={{
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
      testID={mobileTestIds.tasks.scheduleRow(schedule.id)}
    >
      <Repeat size={18} color={paused ? "#9ca3af" : "#3b82f6"} />

      <TouchableOpacity
        className="flex-1 min-w-0"
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${t("card.edit")}: ${schedule.title}`}
      >
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink"
            numberOfLines={1}
          >
            {schedule.title}
          </Text>
          {paused && (
            <View className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
              <Text className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {t("schedules.paused")}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          {summarize(schedule)}
        </Text>
        {linkedActivity && (
          <View className="flex-row items-center gap-1 mt-0.5">
            <ActivityIcon
              iconType={linkedActivity.iconType}
              emoji={linkedActivity.emoji || "\u{1f4dd}"}
              iconBlob={iconBlobMap.get(linkedActivity.id)}
              iconUrl={linkedActivity.iconUrl}
              iconThumbnailUrl={linkedActivity.iconThumbnailUrl}
              size={14}
              fontSize="text-xs"
            />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {linkedActivity.name}
              {schedule.quantity !== null
                ? ` · ${schedule.quantity}${linkedActivity.quantityUnit ? ` ${linkedActivity.quantityUnit}` : ""}`
                : ""}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-1 mt-0.5">
          <CalendarDays size={12} color="#9ca3af" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {range.start} - {range.end ?? t("schedules.noEndDate")}
          </Text>
        </View>
      </TouchableOpacity>

      <View className="flex-row items-center gap-0.5">
        <TouchableOpacity
          onPress={onToggleActive}
          className="p-1.5"
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={
            paused ? t("schedules.resume") : t("schedules.pause")
          }
          testID={mobileTestIds.tasks.scheduleToggleActive(schedule.id)}
        >
          {paused ? (
            <Play size={16} color="#16a34a" />
          ) : (
            <Pause size={16} color="#9ca3af" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className="p-1.5"
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t("card.delete")}
          testID={mobileTestIds.tasks.scheduleDelete(schedule.id)}
        >
          <Trash2 size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
