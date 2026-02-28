import { View, Text } from "react-native";
import { TaskCard } from "./TaskCard";
import type { TaskItem } from "./types";

export function TaskGroup({
  title,
  tasks,
  titleColor = "text-gray-700",
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: {
  title: string;
  tasks: TaskItem[];
  titleColor?: string;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onArchive: (task: TaskItem) => void;
  onMoveToToday?: (task: TaskItem) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-center mb-2">
        <Text className={`text-sm font-semibold ${titleColor}`}>{title} </Text>
        <Text className="text-xs text-gray-400">({tasks.length})</Text>
      </View>
      <View className="gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            highlight={highlight}
            completed={completed}
            archived={archived}
            onToggleDone={() => onToggleDone(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
            onArchive={() => onArchive(task)}
            onMoveToToday={
              onMoveToToday ? () => onMoveToToday(task) : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}
