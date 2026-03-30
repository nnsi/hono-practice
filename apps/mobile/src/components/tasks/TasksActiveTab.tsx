import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { TaskGroup } from "./TaskGroup";
import { TasksCompletedSection } from "./TasksCompletedSection";
import { TasksFutureSection } from "./TasksFutureSection";
import type { TaskItem } from "./types";

type GroupedTasks = {
  overdue: TaskItem[];
  dueToday: TaskItem[];
  startingToday: TaskItem[];
  inProgress: TaskItem[];
  dueThisWeek: TaskItem[];
  notStarted: TaskItem[];
  future: TaskItem[];
  completed: TaskItem[];
};

type TasksActiveTabProps = {
  hasAnyTasks: boolean;
  groupedTasks: GroupedTasks;
  futureCount: number;
  completedCount: number;
  showFuture: boolean;
  setShowFuture: (v: boolean) => void;
  showCompleted: boolean;
  setShowCompleted: (v: boolean) => void;
  handleToggleDone: (task: TaskItem) => void;
  setEditingTask: (task: TaskItem) => void;
  setDeleteConfirmId: (id: string) => void;
  handleArchive: (task: TaskItem) => void;
  handleMoveToToday: (task: TaskItem) => void;
  setCreateDialogOpen: (v: boolean) => void;
};

export function TasksActiveTab({
  hasAnyTasks,
  groupedTasks,
  futureCount,
  completedCount,
  showFuture,
  setShowFuture,
  showCompleted,
  setShowCompleted,
  handleToggleDone,
  setEditingTask,
  setDeleteConfirmId,
  handleArchive,
  handleMoveToToday,
  setCreateDialogOpen,
}: TasksActiveTabProps) {
  const { t } = useTranslation("task");

  return (
    <View className="gap-6">
      {!hasAnyTasks && (
        <View className="items-center py-12">
          <Text className="text-gray-500 dark:text-gray-400 mb-4">
            {t("page.empty")}
          </Text>
          <TouchableOpacity
            onPress={() => setCreateDialogOpen(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg"
            accessibilityRole="button"
            accessibilityLabel={t("page.firstTask")}
          >
            <Text className="text-white text-sm">{t("page.firstTask")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {groupedTasks.overdue.length > 0 && (
        <TaskGroup
          title={t("page.group.overdue")}
          tasks={groupedTasks.overdue}
          titleColor="text-red-600 dark:text-red-400"
          highlight
          onToggleDone={handleToggleDone}
          onEdit={setEditingTask}
          onDelete={setDeleteConfirmId}
          onArchive={handleArchive}
          onMoveToToday={handleMoveToToday}
        />
      )}

      {groupedTasks.dueToday.length > 0 && (
        <TaskGroup
          title={t("page.group.dueToday")}
          tasks={groupedTasks.dueToday}
          titleColor="text-orange-600"
          onToggleDone={handleToggleDone}
          onEdit={setEditingTask}
          onDelete={setDeleteConfirmId}
          onArchive={handleArchive}
          onMoveToToday={handleMoveToToday}
        />
      )}

      {groupedTasks.startingToday.length > 0 && (
        <TaskGroup
          title={t("page.group.startingToday")}
          tasks={groupedTasks.startingToday}
          titleColor="text-blue-600 dark:text-blue-400"
          onToggleDone={handleToggleDone}
          onEdit={setEditingTask}
          onDelete={setDeleteConfirmId}
          onArchive={handleArchive}
          onMoveToToday={handleMoveToToday}
        />
      )}

      {groupedTasks.inProgress.length > 0 && (
        <TaskGroup
          title={t("page.group.inProgress")}
          tasks={groupedTasks.inProgress}
          titleColor="text-green-600 dark:text-green-400"
          onToggleDone={handleToggleDone}
          onEdit={setEditingTask}
          onDelete={setDeleteConfirmId}
          onArchive={handleArchive}
          onMoveToToday={handleMoveToToday}
        />
      )}

      {groupedTasks.dueThisWeek.length > 0 && (
        <TaskGroup
          title={t("page.group.dueThisWeek")}
          tasks={groupedTasks.dueThisWeek}
          titleColor="text-gray-700 dark:text-gray-300"
          onToggleDone={handleToggleDone}
          onEdit={setEditingTask}
          onDelete={setDeleteConfirmId}
          onArchive={handleArchive}
          onMoveToToday={handleMoveToToday}
        />
      )}

      <TasksFutureSection
        futureCount={futureCount}
        showFuture={showFuture}
        setShowFuture={setShowFuture}
        notStarted={groupedTasks.notStarted}
        future={groupedTasks.future}
        handleToggleDone={handleToggleDone}
        setEditingTask={setEditingTask}
        setDeleteConfirmId={setDeleteConfirmId}
        handleArchive={handleArchive}
        handleMoveToToday={handleMoveToToday}
      />

      <TasksCompletedSection
        completedCount={completedCount}
        showCompleted={showCompleted}
        setShowCompleted={setShowCompleted}
        completed={groupedTasks.completed}
        handleToggleDone={handleToggleDone}
        setEditingTask={setEditingTask}
        setDeleteConfirmId={setDeleteConfirmId}
        handleArchive={handleArchive}
      />

      {hasAnyTasks && (
        <TouchableOpacity
          onPress={() => setCreateDialogOpen(true)}
          className="py-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 flex-row items-center justify-center gap-2"
          accessibilityRole="button"
          accessibilityLabel={t("page.addNew")}
        >
          <Plus size={18} color="#9ca3af" />
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("page.addNew")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
