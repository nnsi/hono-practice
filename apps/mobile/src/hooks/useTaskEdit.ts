import { useState } from "react";

import { apiClient } from "../utils/apiClient";
import { eventBus } from "../utils/eventBus";

type UpdateTaskInput = {
  id: string;
  title: string;
  memo: string | null;
  startDate: string | null;
  dueDate: string | null;
};

export function useTaskEdit() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateTask = async (input: UpdateTaskInput) => {
    setIsUpdating(true);
    try {
      const { id, ...data } = input;
      const response = await apiClient.users.tasks[":id"].$put({
        param: { id },
        json: data,
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
        return await response.json();
      }
      throw new Error("Failed to update task");
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTask = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await apiClient.users.tasks[":id"].$delete({
        param: { id },
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    updateTask,
    deleteTask,
    isUpdating,
    isDeleting,
  };
}
