import { useTranslation } from "@packages/i18n";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";

export type Task = {
  id: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  title: string;
  doneDate: string | null;
  memo: string;
  startDate: string | null;
  dueDate: string | null;
  _syncStatus?: "synced" | "pending" | "failed" | "rejected";
};

type ActivityInfo = {
  emoji: string;
  iconType?: string | null;
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
};

type IconBlob = {
  base64: string;
  mimeType: string;
};

export function TaskList({
  tasks,
  isLoading,
  onToggle,
  activitiesMap,
  iconBlobMap,
}: {
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
  activitiesMap?: Map<string, ActivityInfo>;
  iconBlobMap?: Map<string, IconBlob>;
}) {
  const { t } = useTranslation("activity");

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-gray-400 dark:text-gray-500 text-sm">
          {t("daily.noTasks")}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {tasks.map((task) => {
        const activity = task.activityId
          ? activitiesMap?.get(task.activityId)
          : undefined;
        const isPending = task._syncStatus === "pending";
        return (
          <View
            key={task.id}
            className={`flex-row items-center gap-3 p-3 rounded-xl ${
              isPending
                ? "border border-amber-200 bg-amber-50 dark:bg-amber-900/20"
                : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
          >
            <TouchableOpacity
              onPress={() => onToggle(task)}
              className="shrink-0 p-0.5"
              accessibilityRole="checkbox"
              accessibilityLabel={task.title}
              accessibilityState={{ checked: !!task.doneDate }}
            >
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  task.doneDate
                    ? "bg-green-50 dark:bg-green-900/200 border-green-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {task.doneDate && (
                  <Text className="text-white text-xs font-bold">
                    {"\u2713"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {activity && (
              <View className="shrink-0">
                <ActivityIcon
                  iconType={activity.iconType as "emoji" | "upload" | undefined}
                  emoji={activity.emoji || "\u{1F4DD}"}
                  iconBlob={
                    task.activityId
                      ? iconBlobMap?.get(task.activityId)
                      : undefined
                  }
                  iconUrl={activity.iconUrl}
                  iconThumbnailUrl={activity.iconThumbnailUrl}
                  size={28}
                  fontSize="text-xl"
                />
              </View>
            )}
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1.5">
                <Text
                  className={`text-base font-medium flex-shrink ${
                    task.doneDate
                      ? "line-through text-gray-400 dark:text-gray-500"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                {isPending && (
                  <ActivityIndicator size="small" color="#f97316" />
                )}
              </View>
              {task.memo ? (
                <Text
                  className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
                  numberOfLines={1}
                >
                  {task.memo}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
