import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export type Task = {
  id: string;
  title: string;
  doneDate: string | null;
  memo: string;
  startDate: string | null;
  dueDate: string | null;
};

export function TaskList({
  tasks,
  isLoading,
  onToggle,
}: {
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
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
      {tasks.map((task) => (
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
          <View className="flex-1 min-w-0">
            <Text
              className={`text-base font-medium ${
                task.doneDate ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {task.title}
            </Text>
            {task.memo ? (
              <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                {task.memo}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
