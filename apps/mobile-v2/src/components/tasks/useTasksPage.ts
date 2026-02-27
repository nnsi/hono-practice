import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { useTasks } from "../../hooks/useTasks";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { TaskItem } from "./types";
import { groupTasksByTimeline } from "./taskGrouping";

export function useTasksPage() {
  // state
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // data
  const { activeTasks, archivedTasks } = useTasks();

  // computed
  const tasks: TaskItem[] = activeTasks;

  const allGrouped = useMemo(
    () =>
      groupTasksByTimeline(tasks, {
        showCompleted: true,
        showFuture: true,
        completedInTheirCategories: true,
      }),
    [tasks],
  );

  const groupedTasks = useMemo(
    () =>
      groupTasksByTimeline(tasks, {
        showCompleted,
        showFuture,
        completedInTheirCategories: true,
      }),
    [tasks, showCompleted, showFuture],
  );

  const completedCount = allGrouped.completed.length;
  const futureCount = allGrouped.notStarted.length + allGrouped.future.length;

  const hasAnyTasks =
    tasks.length > 0 ||
    Object.values(groupedTasks).some((g) => g.length > 0);

  // handlers
  const handleToggleDone = async (task: TaskItem) => {
    const newDoneDate = task.doneDate
      ? null
      : new Date().toISOString().split("T")[0];
    await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
    syncEngine.syncTasks();
  };

  const handleDelete = async (id: string) => {
    await taskRepository.softDeleteTask(id);
    setDeleteConfirmId(null);
    syncEngine.syncTasks();
  };

  const handleArchive = async (task: TaskItem) => {
    await taskRepository.archiveTask(task.id);
    syncEngine.syncTasks();
  };

  const handleMoveToToday = async (task: TaskItem) => {
    const today = dayjs().format("YYYY-MM-DD");
    await taskRepository.updateTask(task.id, { startDate: today });
    syncEngine.syncTasks();
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingTask(null);
  };

  return {
    // tab
    activeTab,
    setActiveTab,
    // toggles
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    // data
    tasks,
    archivedTasks,
    groupedTasks,
    completedCount,
    futureCount,
    hasAnyTasks,
    // dialog state
    createDialogOpen,
    setCreateDialogOpen,
    editingTask,
    setEditingTask,
    deleteConfirmId,
    setDeleteConfirmId,
    // handlers
    handleToggleDone,
    handleDelete,
    handleArchive,
    handleMoveToToday,
    handleCreateSuccess,
    handleEditSuccess,
  };
}
