import { useLiveQuery } from "../db/useLiveQuery";
import { activityRepository } from "../repositories/activityRepository";

export function useActivities() {
  const activities = useLiveQuery("activities", () =>
    activityRepository.getAllActivities()
  );
  return { activities: activities ?? [] };
}
