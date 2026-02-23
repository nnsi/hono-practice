import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useGoals() {
  const goals = useLiveQuery(() =>
    db.goals.filter((g) => !g.deletedAt).toArray(),
  );

  return { goals: goals ?? [] };
}
