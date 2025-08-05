import { useState } from "react";

import { useArchiveTask, useUpdateTask } from "@frontend/hooks/api/useTasks";
import dayjs from "dayjs";

type TaskItem = {
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

export const useTaskGroup = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();

  // タスクの完了/未完了を切り替え
  const handleToggleTaskDone = (task: TaskItem) => {
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
  };

  // タスクを今日に移動
  const handleMoveToToday = (task: TaskItem) => {
    const today = dayjs().format("YYYY-MM-DD");
    updateTask.mutate({
      id: task.id,
      data: {
        startDate: today,
        // 締切日も今日に設定
        dueDate: today,
      },
    });
  };

  // タスクアーカイブ
  const handleArchiveTask = (task: TaskItem) => {
    archiveTask.mutate({ id: task.id, date: task.startDate || undefined });
  };

  // タスクをクリックしたときの処理
  const handleTaskClick = (task: TaskItem) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  // ダイアログ成功時の処理
  const handleDialogSuccess = () => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

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
};
