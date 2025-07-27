import { useState } from "react";

import { apiClient } from "../utils/apiClient";
import { eventBus } from "../utils/eventBus";

type CreateTaskInput = {
  title: string;
  memo?: string;
  startDate: string;
  dueDate?: string;
};

export function useTaskCreate() {
  const [isCreating, setIsCreating] = useState(false);

  const createTask = async (input: CreateTaskInput) => {
    setIsCreating(true);
    try {
      const response = await apiClient.users.tasks.$post({
        json: input,
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
        return await response.json();
      }
      throw new Error("Failed to create task");
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTask,
    isCreating,
  };
}
