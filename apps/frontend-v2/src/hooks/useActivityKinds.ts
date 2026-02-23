import { useLiveQuery } from "dexie-react-hooks";
import { db, type DexieActivityKind } from "../db/schema";

export function useActivityKinds(activityId: string | null) {
  const kinds = useLiveQuery(
    (): Promise<DexieActivityKind[]> => {
      if (!activityId) return Promise.resolve([]);
      return db.activityKinds
        .where("activityId")
        .equals(activityId)
        .filter((k) => !k.deletedAt)
        .toArray();
    },
    [activityId],
  );

  return { kinds: kinds ?? [] };
}
