import { useLiveQuery } from "../db/useLiveQuery";
import { taskRepository } from "../repositories/taskRepository";

export function useTasks() {
  const activeTasks = useLiveQuery("tasks", () =>
    taskRepository.getAllActiveTasks()
  );
  const archivedTasks = useLiveQuery("tasks", () =>
    taskRepository.getArchivedTasks()
  );
  return {
    activeTasks: activeTasks ?? [],
    archivedTasks: archivedTasks ?? [],
  };
}
