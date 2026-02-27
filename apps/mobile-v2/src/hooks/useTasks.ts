import { useLiveQuery } from "../db/useLiveQuery";
import { taskRepository } from "../repositories/taskRepository";
import {
  isActiveTask,
  isArchivedTask,
  isTaskVisibleOnDate,
} from "@packages/domain/task/taskPredicates";

export function useActiveTasks() {
  const tasks = useLiveQuery("tasks", async () => {
    const all = await taskRepository.getAllActiveTasks();
    return all.filter((t) => isActiveTask(t));
  });

  return { tasks: tasks ?? [] };
}

export function useArchivedTasks() {
  const tasks = useLiveQuery("tasks", async () => {
    const all = await taskRepository.getArchivedTasks();
    return all
      .filter((t) => isArchivedTask(t))
      .sort((a, b) => {
        const aAt = a.archivedAt ?? "";
        const bAt = b.archivedAt ?? "";
        return bAt.localeCompare(aAt);
      });
  });

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery(
    "tasks",
    async () => {
      const all = await taskRepository.getAllActiveTasks();
      return all.filter((t) => isTaskVisibleOnDate(t, date));
    },
    [date],
  );

  return { tasks: tasks ?? [] };
}
