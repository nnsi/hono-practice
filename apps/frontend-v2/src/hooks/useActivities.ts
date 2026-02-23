import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useActivities() {
  const activities = useLiveQuery(() =>
    db.activities
      .orderBy("orderIndex")
      .filter((a) => !a.deletedAt)
      .toArray(),
  );

  return { activities: activities ?? [] };
}
