import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
};

type ActivityInfo = {
  emoji: string;
  iconType?: string | null;
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
};

export function TaskList({
  tasks,
  isLoading,
  onToggle,
  activitiesMap,
}: {
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
  activitiesMap?: Map<string, ActivityInfo>;
}) {
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
        <Text className="text-gray-400 text-sm">タスクはありません</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {tasks.map((task) => {
        const activity = task.activityId
          ? activitiesMap?.get(task.activityId)
          : undefined;
        return (
          <View
            key={task.id}
            className="flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
          >
            <TouchableOpacity
              onPress={() => onToggle(task)}
              className="shrink-0 p-0.5"
            >
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  task.doneDate
                    ? "bg-green-500 border-green-500"
                    : "border-gray-300"
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
                {activity.iconType === "upload" &&
                (activity.iconThumbnailUrl || activity.iconUrl) ? (
                  <Image
                    source={{
                      uri: activity.iconThumbnailUrl || activity.iconUrl || "",
                    }}
                    style={{ width: 28, height: 28, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-xl">
                    {activity.emoji || "\u{1F4DD}"}
                  </Text>
                )}
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text
                className={`text-base font-medium ${
                  task.doneDate ? "line-through text-gray-400" : "text-gray-800"
                }`}
              >
                {task.title}
              </Text>
              {task.memo ? (
                <Text
                  className="text-xs text-gray-400 mt-0.5"
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
