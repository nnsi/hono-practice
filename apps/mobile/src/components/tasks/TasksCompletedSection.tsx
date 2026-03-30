import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { TaskGroup } from "./TaskGroup";
import type { TaskItem } from "./types";

type TasksCompletedSectionProps = {
  completedCount: number;
  showCompleted: boolean;
  setShowCompleted: (v: boolean) => void;
  completed: TaskItem[];
  handleToggleDone: (task: TaskItem) => void;
  setEditingTask: (task: TaskItem) => void;
  setDeleteConfirmId: (id: string) => void;
  handleArchive: (task: TaskItem) => void;
};

export function TasksCompletedSection({
  completedCount,
  showCompleted,
  setShowCompleted,
  completed,
  handleToggleDone,
  setEditingTask,
  setDeleteConfirmId,
  handleArchive,
}: TasksCompletedSectionProps) {
  const { t } = useTranslation("task");

  if (completedCount === 0) return null;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowCompleted(!showCompleted)}
        className="flex-row items-center gap-1"
        accessibilityRole="button"
        accessibilityLabel={
          showCompleted
            ? "完了済みを隠す"
            : `完了済みを表示 (${completedCount})`
        }
      >
        {showCompleted ? (
          <ChevronDown size={16} color="#6b7280" />
        ) : (
          <ChevronRight size={16} color="#6b7280" />
        )}
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {showCompleted
            ? "完了済みを隠す"
            : `完了済みを表示 (${completedCount})`}
        </Text>
      </TouchableOpacity>
      {showCompleted && completed.length > 0 && (
        <View className="mt-3">
          <TaskGroup
            title={t("page.group.completed")}
            tasks={completed}
            titleColor="text-gray-500 dark:text-gray-400"
            completed
            onToggleDone={handleToggleDone}
            onEdit={setEditingTask}
            onDelete={setDeleteConfirmId}
            onArchive={handleArchive}
          />
        </View>
      )}
    </View>
  );
}
