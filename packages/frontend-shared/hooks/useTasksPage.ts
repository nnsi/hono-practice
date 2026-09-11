import { groupTasksByTimeline as groupTasksByTimelineCore } from "@packages/domain/task/taskGrouping";
import type { TaskItem } from "@packages/domain/task/types";

import { getToday } from "../utils/dateUtils";
import {
  isVirtualScheduledTask,
  materializeScheduledTask,
} from "./materializeScheduledTask";
import { toggleTaskWithActivityLog } from "./taskToggleWithActivityLog";
import type { TasksTab, UseTasksPageDeps } from "./useTasksPage.types";
import { createUseTodayScheduledTasks } from "./useTodayScheduledTasks";

export function createUseTasksPage(deps: UseTasksPageDeps) {
  const {
    react: { useState, useMemo },
    useActiveTasks,
    useArchivedTasks,
    useActiveTaskSchedules,
    useTasksOnScheduledDate,
    taskRepository,
    activityLogRepository,
    syncEngine,
    useShowCompletedState,
  } = deps;

  const useShowCompletedStateImpl =
    useShowCompletedState ?? (() => useState(false));
  const useTodayScheduledTasks = createUseTodayScheduledTasks({
    react: { useMemo },
    useActiveTaskSchedules,
    useTasksOnScheduledDate,
  });

  return function useTasksPage() {
    // state
    const [activeTab, setActiveTab] = useState<TasksTab>("active");
    const [showCompleted, setShowCompleted] = useShowCompletedStateImpl();
    const [showFuture, setShowFuture] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingTask, setEditingTaskState] = useState<TaskItem | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // data
    const today = getToday();
    const { tasks: activeTasks } = useActiveTasks();
    const { tasks: archivedTasks } = useArchivedTasks();
    const virtualTasks = useTodayScheduledTasks(today);

    // computed: 実 Task ∪ 今日の仮想タスク
    const tasks: TaskItem[] = useMemo(
      () => [...activeTasks, ...virtualTasks],
      [activeTasks, virtualTasks],
    );

    const allGrouped = useMemo(
      () =>
        groupTasksByTimelineCore(
          tasks,
          { showCompleted: true, showFuture: true },
          today,
        ),
      [tasks, today],
    );
    const groupedTasks = useMemo(
      () =>
        groupTasksByTimelineCore(tasks, { showCompleted, showFuture }, today),
      [tasks, showCompleted, showFuture, today],
    );

    const completedCount = allGrouped.completed.length;
    const futureCount = allGrouped.notStarted.length + allGrouped.future.length;
    // 完了・削除・編集・archive で共有。仮想タスクの二重実体化も防ぐ
    const pendingTaskIds = useMemo(() => new Set<string>(), []);

    const hasAnyTasks =
      tasks.length > 0 || Object.values(groupedTasks).some((g) => g.length > 0);

    /** 同一 task への連打を抑止しつつ、仮想タスクなら先に実体化して処理に渡す */
    const withMaterialized = async (
      task: TaskItem,
      run: (real: TaskItem) => Promise<void>,
    ) => {
      if (pendingTaskIds.has(task.id)) return;
      pendingTaskIds.add(task.id);
      try {
        // 実 Task は余計な await を挟まず同期的に run に渡す（連打抑止の挙動を変えない）
        const real = isVirtualScheduledTask(task)
          ? await materializeScheduledTask(taskRepository, task)
          : task;
        await run(real);
      } finally {
        pendingTaskIds.delete(task.id);
      }
    };

    // handlers
    const handleToggleDone = (task: TaskItem) =>
      withMaterialized(task, (real) =>
        toggleTaskWithActivityLog(
          { taskRepository, activityLogRepository, syncEngine },
          real,
          getToday(),
        ),
      );

    const handleDelete = async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      const run = async () => {
        await taskRepository.softDeleteTask(id);
        setDeleteConfirmId(null);
        void syncEngine.syncTasks().catch(() => {});
      };
      // 一覧に無い id（編集ダイアログ経由等）は従来通りそのまま削除する
      if (task) await withMaterialized(task, run);
      else await run();
    };

    const handleArchive = (task: TaskItem) =>
      withMaterialized(task, async (real) => {
        await taskRepository.archiveTask(real.id);
        void syncEngine.syncTasks().catch(() => {});
      });

    const handleMoveToToday = (task: TaskItem) =>
      withMaterialized(task, async (real) => {
        await taskRepository.updateTask(real.id, { startDate: getToday() });
        void syncEngine.syncTasks().catch(() => {});
      });

    // 編集ダイアログは仮想タスクをそのまま受け取り、保存時に実体化する（useTaskEditDialog 側）。
    // 見るだけで行が永続化しないようにするため、起動時には実体化しない
    const setEditingTask = setEditingTaskState;

    const handleCreateSuccess = () => setCreateDialogOpen(false);
    const handleEditSuccess = () => setEditingTaskState(null);

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
