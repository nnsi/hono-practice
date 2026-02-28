import dayjs from "dayjs";
import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type { TaskItem } from "@packages/domain/task/types";
import type { ReactHooks } from "./types";

type UseTasksPageDeps = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  useActiveTasks: () => { tasks: TaskItem[] };
  useArchivedTasks: () => { tasks: TaskItem[] };
  taskRepository: {
    updateTask: (
      id: string,
      data: { doneDate: string | null } | { startDate: string },
    ) => Promise<unknown>;
    softDeleteTask: (id: string) => Promise<unknown>;
    archiveTask: (id: string) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => void };
};

export function createUseTasksPage(deps: UseTasksPageDeps) {
  const {
    react: { useState, useMemo },
    useActiveTasks,
    useArchivedTasks,
    taskRepository,
    syncEngine,
  } = deps;

  return function useTasksPage() {
    // state
    const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
    const [showCompleted, setShowCompleted] = useState(false);
    const [showFuture, setShowFuture] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // data
    const { tasks: activeTasks } = useActiveTasks();
    const { tasks: archivedTasks } = useArchivedTasks();

    // computed
    const tasks: TaskItem[] = activeTasks;
    const today = dayjs().format("YYYY-MM-DD");

    const allGrouped = useMemo(
      () =>
        groupTasksByTimelineCore(
          tasks,
          { showCompleted: true, showFuture: true, completedInTheirCategories: true },
          today,
        ),
      [tasks, today],
    );

    const groupedTasks = useMemo(
      () =>
        groupTasksByTimelineCore(
          tasks,
          { showCompleted, showFuture, completedInTheirCategories: true },
          today,
        ),
      [tasks, showCompleted, showFuture, today],
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
      const todayStr = dayjs().format("YYYY-MM-DD");
      await taskRepository.updateTask(task.id, { startDate: todayStr });
      syncEngine.syncTasks();
    };

    const handleCreateSuccess = () => {
      setCreateDialogOpen(false);
    };

    const handleEditSuccess = () => {
      setEditingTask(null);
    };

    return {
      activeTab,
      setActiveTab,
      showCompleted,
      setShowCompleted,
      showFuture,
      setShowFuture,
      tasks,
      archivedTasks,
      groupedTasks,
      completedCount,
      futureCount,
      hasAnyTasks,
      createDialogOpen,
      setCreateDialogOpen,
      editingTask,
      setEditingTask,
      deleteConfirmId,
      setDeleteConfirmId,
      handleToggleDone,
      handleDelete,
      handleArchive,
      handleMoveToToday,
      handleCreateSuccess,
      handleEditSuccess,
    };
  };
}
