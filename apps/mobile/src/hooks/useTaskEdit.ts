import {
  createUseDeleteTask,
  createUseUpdateTask,
} from "@packages/frontend-shared/hooks";

import { apiClient } from "../utils/apiClient";

type UpdateTaskInput = {
  id: string;
  title: string;
  memo: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export function useTaskEdit() {
  // 共通フックを使用
  const updateTaskMutation = createUseUpdateTask({ apiClient });
  const deleteTaskMutation = createUseDeleteTask({ apiClient });

  const updateTask = async (input: UpdateTaskInput) => {
    try {
      const { id, ...data } = input;
      const result = await updateTaskMutation.mutateAsync({
        id,
        data,
      });
      return result;
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  };

  return {
    updateTask,
    deleteTask,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
