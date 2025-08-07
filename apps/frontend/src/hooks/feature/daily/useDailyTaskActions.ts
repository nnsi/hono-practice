import type React from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { createUseDailyTaskActions } from "@packages/frontend-shared/hooks/feature";

import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";

// 共通フックをインスタンス化
const useDailyTaskActionsBase = createUseDailyTaskActions({ apiClient });

export const useDailyTaskActions = (date: Date) => {
  const {
    createDialogOpen,
    setCreateDialogOpen,
    updateTask,
    deleteTask,
    handleToggleTaskDone,
    handleDeleteTask: handleDeleteTaskBase,
  } = useDailyTaskActionsBase(date);

  // Web固有：タスクを削除するハンドラ（イベント処理を含む）
  const handleDeleteTask = (e: React.MouseEvent, task: GetTaskResponse) => {
    e.stopPropagation();
    handleDeleteTaskBase(task);
  };

  return {
    createDialogOpen,
    setCreateDialogOpen,
    updateTask,
    deleteTask,
    handleToggleTaskDone,
    handleDeleteTask,
  };
};
