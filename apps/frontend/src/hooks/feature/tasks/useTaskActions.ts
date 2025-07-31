import type React from "react";
import { useState } from "react";

import {
  useArchiveTask,
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
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

export const useTaskActions = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // 同期対応のフックを使用
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();

  // タスクの完了/未完了を切り替えるハンドラ
  const handleToggleTaskDone = (task: TaskItem) => {
    updateTask.mutate({
      id: task.id,
      doneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
    });
  };

  // タスクを削除するハンドラ
  const handleDeleteTask = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    deleteTask.mutate({ id: task.id });
  };

  // タスクをアーカイブするハンドラ
  const handleArchiveTask = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    archiveTask.mutate({ id: task.id, date: task.startDate || undefined });
  };

  // タスク編集の開始
  const handleStartEdit = (task: TaskItem) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  // ダイアログクローズ時の処理
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedTask(null);
  };

  // 日付のフォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return dayjs(dateStr).format("MM/DD");
  };

  return {
    // Dialog states
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedTask,

    // Actions
    handleToggleTaskDone,
    handleDeleteTask,
    handleArchiveTask,
    handleStartEdit,
    handleEditDialogClose,

    // Utilities
    formatDate,

    // Mutation states
    deleteTaskPending: deleteTask.isPending,
    archiveTaskPending: archiveTask.isPending,
  };
};
