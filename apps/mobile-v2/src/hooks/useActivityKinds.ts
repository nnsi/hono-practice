import { useLiveQuery } from "../db/useLiveQuery";
import { activityRepository } from "../repositories/activityRepository";

export function useActivityKinds(activityId?: string) {
  const kinds = useLiveQuery(
    "activity_kinds",
    () =>
      activityId
        ? activityRepository.getActivityKindsByActivityId(activityId)
        : Promise.resolve([]),
    [activityId]
  );
  return { kinds: kinds ?? [] };
}
