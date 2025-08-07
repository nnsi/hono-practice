import type React from "react";
import { useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { createUseTaskActions } from "@packages/frontend-shared/hooks/feature";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 共通のロジックを使用
  const {
    selectedTask,
    handleToggleTaskDone,
    handleDeleteTask: handleDeleteTaskBase,
    handleArchiveTask: handleArchiveTaskBase,
    handleSelectTask,
    formatDate,
    deleteTaskPending,
    archiveTaskPending,
  } = useTaskActionsBase();

  // Web固有：タスクを削除するハンドラ（イベント処理を含む）
  const handleDeleteTask = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    handleDeleteTaskBase(task);
  };

  // Web固有：タスクをアーカイブするハンドラ（イベント処理を含む）
  const handleArchiveTask = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    handleArchiveTaskBase(task);
  };

  // Web固有：タスク編集の開始
  const handleStartEdit = (task: TaskItem) => {
    handleSelectTask(task);
    setEditDialogOpen(true);
  };

  // Web固有：ダイアログクローズ時の処理
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    handleSelectTask(null);
  };

  return {
    // Dialog states (Web固有)
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
    deleteTaskPending,
    archiveTaskPending,
  };
};
