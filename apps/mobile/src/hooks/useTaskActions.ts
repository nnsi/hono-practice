import dayjs from "dayjs";

import { apiClient } from "../utils/apiClient";
import { eventBus } from "../utils/eventBus";

type Task = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
};

export function useTaskActions() {
  const toggleTaskDone = async (task: Task) => {
    try {
      const response = await apiClient.users.tasks[":id"].$put({
        param: { id: task.id },
        json: {
          doneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
        },
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
      }
    } catch (error) {
      console.error("Failed to toggle task done:", error);
    }
  };

  const moveToToday = async (task: Task) => {
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const response = await apiClient.users.tasks[":id"].$put({
        param: { id: task.id },
        json: {
          startDate: today,
          dueDate: task.dueDate || today,
        },
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
      }
    } catch (error) {
      console.error("Failed to move task to today:", error);
    }
  };

  const archiveTask = async (task: Task) => {
    try {
      const response = await apiClient.users.tasks[":id"].archive.$post({
        param: { id: task.id },
      });

      if (response.ok) {
        eventBus.emit("tasks:refresh");
      }
    } catch (error) {
      console.error("Failed to archive task:", error);
    }
  };

  return {
    toggleTaskDone,
    moveToToday,
    archiveTask,
  };
}
