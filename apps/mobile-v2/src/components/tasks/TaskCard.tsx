import { View, Text, TouchableOpacity } from "react-native";
import { Circle, CheckCircle2 } from "lucide-react-native";
import dayjs from "dayjs";

type TaskCardProps = {
  task: {
    id: string;
    title: string;
    dueDate: string | null;
    doneDate: string | null;
    memo: string;
  };
  onPress: () => void;
  onLongPress: () => void;
  onToggleDone: () => void;
};

export function TaskCard({
  task,
  onPress,
  onLongPress,
  onToggleDone,
}: TaskCardProps) {
  const isDone = task.doneDate !== null;
  const isOverdue =
    !isDone &&
    task.dueDate !== null &&
    dayjs(task.dueDate).isBefore(dayjs(), "day");

  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100"
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <TouchableOpacity onPress={onToggleDone} className="mr-3 p-0.5">
        {isDone ? (
          <CheckCircle2 size={22} color="#10b981" />
        ) : (
          <Circle size={22} color="#d1d5db" />
        )}
      </TouchableOpacity>

      {/* Content */}
      <View className="flex-1">
        <Text
          className={`text-base ${
            isDone
              ? "text-gray-400 line-through"
              : "text-gray-800"
          }`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.dueDate ? (
          <Text
            className={`text-xs mt-0.5 ${
              isOverdue ? "text-red-500 font-medium" : "text-gray-400"
            }`}
          >
            {isOverdue ? "期限切れ: " : "期限: "}
            {dayjs(task.dueDate).format("MM/DD")}
          </Text>
        ) : null}
        {task.memo ? (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {task.memo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
