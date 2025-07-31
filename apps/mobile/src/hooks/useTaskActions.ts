import {
  createUseArchiveTask,
  createUseUpdateTask,
} from "@packages/frontend-shared/hooks";
import dayjs from "dayjs";

import { apiClient } from "../utils/apiClient";

type Task = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
};

export function useTaskActions() {
  // 共通フックを使用
  const updateTaskMutation = createUseUpdateTask({ apiClient });
  const archiveTaskMutation = createUseArchiveTask({ apiClient });

  const toggleTaskDone = async (task: Task) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        data: {
          doneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
        },
      });
    } catch (error) {
      console.error("Failed to toggle task done:", error);
    }
  };

  const archiveTask = async (task: Task) => {
    try {
      await archiveTaskMutation.mutateAsync({
        id: task.id,
      });
    } catch (error) {
      console.error("Failed to archive task:", error);
    }
  };

  return {
    toggleTaskDone,
    archiveTask,
  };
}
