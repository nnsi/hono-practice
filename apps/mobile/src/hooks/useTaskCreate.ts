import { createUseCreateTask } from "@packages/frontend-shared/hooks";

import { apiClient } from "../utils/apiClient";

type CreateTaskInput = {
  title: string;
  memo?: string;
  startDate: string;
  dueDate?: string;
};

export function useTaskCreate() {
  // 共通フックを使用
  const createTaskMutation = createUseCreateTask({ apiClient });

  const createTask = async (input: CreateTaskInput) => {
    try {
      const result = await createTaskMutation.mutateAsync(input);
      return result;
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  return {
    createTask,
    isCreating: createTaskMutation.isPending,
  };
}
