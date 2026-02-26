import { useLiveQuery } from "../db/useLiveQuery";
import { activityRepository } from "../repositories/activityRepository";

export function useActivityKinds(activityId?: string) {
  const kinds = useLiveQuery(
    "activity_kinds",
    () =>
      activityId
        ? activityRepository.getActivityKindsByActivityId(activityId)
        : activityRepository.getAllActivityKinds(),
    [activityId]
  );
  return { kinds: kinds ?? [] };
}
