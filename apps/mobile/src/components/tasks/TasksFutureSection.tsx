import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { TaskGroup } from "./TaskGroup";
import type { TaskItem } from "./types";

type TasksFutureSectionProps = {
  futureCount: number;
  showFuture: boolean;
  setShowFuture: (v: boolean) => void;
  notStarted: TaskItem[];
  future: TaskItem[];
  handleToggleDone: (task: TaskItem) => void;
  setEditingTask: (task: TaskItem) => void;
  setDeleteConfirmId: (id: string) => void;
  handleArchive: (task: TaskItem) => void;
  handleMoveToToday?: (task: TaskItem) => void;
};

export function TasksFutureSection({
  futureCount,
  showFuture,
  setShowFuture,
  notStarted,
  future,
  handleToggleDone,
  setEditingTask,
  setDeleteConfirmId,
  handleArchive,
  handleMoveToToday,
}: TasksFutureSectionProps) {
  const { t } = useTranslation("task");

  if (futureCount === 0) return null;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowFuture(!showFuture)}
        className="flex-row items-center gap-1"
        accessibilityRole="button"
        accessibilityLabel={
          showFuture ? "未来のタスクを隠す" : `未来のタスク (${futureCount})`
        }
      >
        {showFuture ? (
          <ChevronDown size={16} color="#6b7280" />
        ) : (
          <ChevronRight size={16} color="#6b7280" />
        )}
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {showFuture ? "未来のタスクを隠す" : `未来のタスク (${futureCount})`}
        </Text>
      </TouchableOpacity>
      {showFuture && (
        <View className="mt-3 gap-6">
          {notStarted.length > 0 && (
            <TaskGroup
              title={t("page.group.notStarted")}
              tasks={notStarted}
              titleColor="text-purple-600"
              onToggleDone={handleToggleDone}
              onEdit={setEditingTask}
              onDelete={setDeleteConfirmId}
              onArchive={handleArchive}
              onMoveToToday={handleMoveToToday}
            />
          )}
          {future.length > 0 && (
            <TaskGroup
              title={t("page.group.future")}
              tasks={future}
              titleColor="text-indigo-600"
              onToggleDone={handleToggleDone}
              onEdit={setEditingTask}
              onDelete={setDeleteConfirmId}
              onArchive={handleArchive}
              onMoveToToday={handleMoveToToday}
            />
          )}
        </View>
      )}
    </View>
  );
}
