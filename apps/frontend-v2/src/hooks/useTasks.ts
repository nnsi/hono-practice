import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import {
  isActiveTask,
  isArchivedTask,
  isTaskVisibleOnDate,
} from "@packages/domain/task/taskPredicates";

export function useActiveTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks.filter((t) => isActiveTask(t)).toArray(),
  );

  return { tasks: tasks ?? [] };
}

export function useArchivedTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks
      .filter((t) => isArchivedTask(t))
      .sortBy("archivedAt")
      .then((arr) => arr.reverse()),
  );

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter((t) => isTaskVisibleOnDate(t, date))
        .toArray(),
    [date],
  );

  return { tasks: tasks ?? [] };
}
