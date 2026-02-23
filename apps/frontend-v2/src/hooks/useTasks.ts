import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useActiveTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks.filter((t) => !t.deletedAt && !t.archivedAt).toArray(),
  );

  return { tasks: tasks ?? [] };
}

export function useArchivedTasks() {
  const tasks = useLiveQuery(() =>
    db.tasks.filter((t) => !t.deletedAt && !!t.archivedAt).toArray(),
  );

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter((t) => {
          if (t.deletedAt || t.archivedAt) return false;
          if (t.startDate && t.startDate > date) return false;
          return true;
        })
        .toArray(),
    [date],
  );

  return { tasks: tasks ?? [] };
}
