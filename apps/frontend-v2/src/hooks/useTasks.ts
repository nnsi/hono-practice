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
    db.tasks
      .filter((t) => !t.deletedAt && !!t.archivedAt)
      .sortBy("archivedAt")
      .then((arr) => arr.reverse()),
  );

  return { tasks: tasks ?? [] };
}

export function useTasksByDate(date: string) {
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter((t) => {
          if (t.deletedAt || t.archivedAt) return false;

          // 完了済み: 完了日と一致する日だけ表示
          if (t.doneDate) {
            return t.doneDate === date;
          }

          // 未完了: 期間内 or 期間指定なし
          if (t.startDate && t.startDate > date) return false;
          if (t.dueDate && t.dueDate < date) return false;
          return true;
        })
        .toArray(),
    [date],
  );

  return { tasks: tasks ?? [] };
}
