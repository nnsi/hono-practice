import { useState } from "react";

import { createUseTaskActions } from "@frontend-shared/hooks/feature";

import { apiClient } from "../../../utils/apiClient";

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

// 共通フックをインスタンス化
const useTaskActionsBase = createUseTaskActions({ apiClient });

export const useTaskActions = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 共通のロジックを使用
  const {
    selectedTask,
    handleToggleTaskDone,
    handleDeleteTask,
    handleArchiveTask,
    handleSelectTask,
    formatDate,
    deleteTaskPending,
    archiveTaskPending,
  } = useTaskActionsBase();

  // React Native固有：タスク編集の開始
  const handleStartEdit = (task: TaskItem) => {
    handleSelectTask(task);
    setEditDialogOpen(true);
  };

  // React Native固有：ダイアログクローズ時の処理
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    handleSelectTask(null);
  };

  // React Native版ではタスクをトグルするメソッドをそのまま使用
  const toggleTaskDone = handleToggleTaskDone;

  // React Native版ではアーカイブメソッドをそのまま使用
  const archiveTask = handleArchiveTask;

  return {
    // Dialog states
    editDialogOpen,
    setEditDialogOpen,
    selectedTask,

    // Actions
    toggleTaskDone,
    handleToggleTaskDone,
    handleDeleteTask,
    archiveTask,
    handleArchiveTask,
    handleStartEdit,
    handleEditDialogClose,
    handleSelectTask,

    // Utilities
    formatDate,

    // Mutation states
    deleteTaskPending,
    archiveTaskPending,
  };
};
