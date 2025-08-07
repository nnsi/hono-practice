import { useCallback, useState } from "react";

import dayjs from "dayjs";

export type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type TaskGroupDependencies = {
  updateTask: {
    mutate: (params: { id: string; data: any }) => void;
  };
  archiveTask: {
    mutate: (params: { id: string; date?: string }) => void;
  };
};

export type UseTaskGroupReturn = {
  editDialogOpen: boolean;
  selectedTask: TaskItem | null;
  setEditDialogOpen: (open: boolean) => void;
  handleToggleTaskDone: (task: TaskItem) => void;
  handleMoveToToday: (task: TaskItem) => void;
  handleArchiveTask: (task: TaskItem) => void;
  handleTaskClick: (task: TaskItem) => void;
  handleDialogSuccess: () => void;
};

export function createUseTaskGroup(
  dependencies: TaskGroupDependencies,
): UseTaskGroupReturn {
  const { updateTask, archiveTask } = dependencies;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // タスクの完了/未完了を切り替え
  const handleToggleTaskDone = useCallback(
    (task: TaskItem) => {
      console.log("handleToggleTaskDone called:", {
        taskId: task.id,
        currentDoneDate: task.doneDate,
        newDoneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
      });
      updateTask.mutate({
        id: task.id,
        data: {
          doneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
        },
      });
    },
    [updateTask],
  );

  // タスクを今日に移動
  const handleMoveToToday = useCallback(
    (task: TaskItem) => {
      const today = dayjs().format("YYYY-MM-DD");
      updateTask.mutate({
        id: task.id,
        data: {
          startDate: today,
          // 締切日も今日に設定
          dueDate: today,
        },
      });
    },
    [updateTask],
  );

  // タスクアーカイブ
  const handleArchiveTask = useCallback(
    (task: TaskItem) => {
      archiveTask.mutate({ id: task.id, date: task.startDate || undefined });
    },
    [archiveTask],
  );

  // タスクをクリックしたときの処理
  const handleTaskClick = useCallback((task: TaskItem) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  }, []);

  // ダイアログ成功時の処理
  const handleDialogSuccess = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  }, []);

  return {
    editDialogOpen,
    selectedTask,
    setEditDialogOpen,
    handleToggleTaskDone,
    handleMoveToToday,
    handleArchiveTask,
    handleTaskClick,
    handleDialogSuccess,
  };
}
