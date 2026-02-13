import type React from "react";

import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";
import { apiClient } from "@frontend/utils/apiClient";
import { createUseDailyTaskActions } from "@packages/frontend-shared/hooks/feature";

// 共通フックをインスタンス化
const useDailyTaskActionsBase = createUseDailyTaskActions({ apiClient });

export const useDailyTaskActions = (date: Date) => {
  const { stateProps, actions } = useDailyTaskActionsBase(date);

  // Web固有：タスクを削除するハンドラ（イベント処理を含む）
  const handleDeleteTask = (e: React.MouseEvent, task: GetTaskResponse) => {
    e.stopPropagation();
    actions.onDeleteTask(task);
  };

  // 後方互換性を維持
  return {
    ...stateProps,
    // 旧API互換のセッター
    setCreateDialogOpen: actions.onCreateDialogOpenChange,
    // 旧API互換のアクション
    handleToggleTaskDone: actions.onToggleTaskDone,
    handleDeleteTask,
    // 後方互換性のためのupdateTask/deleteTaskシミュレート
    updateTask: { isPending: stateProps.updateTaskPending },
    deleteTask: { isPending: stateProps.deleteTaskPending },
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
