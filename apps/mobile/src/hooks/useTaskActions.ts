import { createUseTaskActions } from "@packages/frontend-shared/hooks/feature";

import { apiClient } from "../utils/apiClient";

// 共通フックをインスタンス化
const useTaskActionsBase = createUseTaskActions({ apiClient });

export function useTaskActions() {
  const {
    handleToggleTaskDone,
    handleArchiveTask,
    formatDate,
    selectedTask,
    handleSelectTask,
    updateTaskPending,
    archiveTaskPending,
  } = useTaskActionsBase();

  // Mobile側では async/await スタイルを維持
  const toggleTaskDone = async (task: any) => {
    try {
      handleToggleTaskDone(task);
    } catch (error) {
      console.error("Failed to toggle task done:", error);
    }
  };

  const archiveTask = async (task: any) => {
    try {
      handleArchiveTask(task);
    } catch (error) {
      console.error("Failed to archive task:", error);
    }
  };

  return {
    toggleTaskDone,
    archiveTask,
    formatDate,
    selectedTask,
    handleSelectTask,
    isUpdating: updateTaskPending,
    isArchiving: archiveTaskPending,
  };
}
