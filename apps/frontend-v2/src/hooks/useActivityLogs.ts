import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useActivityLogsByDate(date: string) {
  const logs = useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .equals(date)
        .filter((log) => log.deletedAt === null)
        .toArray(),
    [date],
  );

  return { logs: logs ?? [] };
}
