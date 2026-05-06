import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type { TaskItem } from "@packages/domain/task/types";

import { getToday } from "../utils/dateUtils";
import { toggleTaskWithActivityLog } from "./taskToggleWithActivityLog";
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
  activityLogRepository: {
    createActivityLog: (input: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
    softDeleteActivityLogByTaskId: (taskId: string) => Promise<void>;
  };
  syncEngine: {
    syncTasks: () => Promise<unknown>;
    syncActivityLogs: () => Promise<unknown>;
  };
  useShowCompletedState?: () => [
    boolean,
    (value: boolean | ((prev: boolean) => boolean)) => void,
  ];
};

export function createUseTasksPage(deps: UseTasksPageDeps) {
  const {
    react: { useState, useMemo },
    useActiveTasks,
    useArchivedTasks,
    taskRepository,
    activityLogRepository,
    syncEngine,
    useShowCompletedState,
  } = deps;

  const useShowCompletedStateImpl =
    useShowCompletedState ?? (() => useState(false));

  return function useTasksPage() {
    // state
    const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
    const [showCompleted, setShowCompleted] = useShowCompletedStateImpl();
    const [showFuture, setShowFuture] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // data
    const { tasks: activeTasks } = useActiveTasks();
    const { tasks: archivedTasks } = useArchivedTasks();

    // computed
    const tasks: TaskItem[] = activeTasks;
    const today = getToday();

    const allGrouped = useMemo(
      () =>
        groupTasksByTimelineCore(
          tasks,
          {
            showCompleted: true,
            showFuture: true,
            completedInTheirCategories: false,
          },
          today,
        ),
      [tasks, today],
    );

    const groupedTasks = useMemo(
      () =>
        groupTasksByTimelineCore(
          tasks,
          { showCompleted, showFuture, completedInTheirCategories: false },
          today,
        ),
      [tasks, showCompleted, showFuture, today],
    );

    const completedCount = allGrouped.completed.length;
    const futureCount = allGrouped.notStarted.length + allGrouped.future.length;
    const pendingToggleTaskIds = useMemo(() => new Set<string>(), []);

    const hasAnyTasks =
      tasks.length > 0 || Object.values(groupedTasks).some((g) => g.length > 0);

    // handlers
    const handleToggleDone = async (task: TaskItem) => {
      if (pendingToggleTaskIds.has(task.id)) {
        return;
      }
      pendingToggleTaskIds.add(task.id);
      try {
        await toggleTaskWithActivityLog(
          {
            taskRepository,
            activityLogRepository,
            syncEngine,
          },
          task,
          getToday(),
        );
      } finally {
        pendingToggleTaskIds.delete(task.id);
      }
    };

    const handleDelete = async (id: string) => {
      await taskRepository.softDeleteTask(id);
      setDeleteConfirmId(null);
      void syncEngine.syncTasks().catch(() => {});
    };

    const handleArchive = async (task: TaskItem) => {
      await taskRepository.archiveTask(task.id);
      void syncEngine.syncTasks().catch(() => {});
    };

    const handleMoveToToday = async (task: TaskItem) => {
      await taskRepository.updateTask(task.id, { startDate: getToday() });
      void syncEngine.syncTasks().catch(() => {});
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
