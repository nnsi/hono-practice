import { v5 } from "uuid";

// Persisted task identity depends on this namespace and name encoding: never change.
const SCHEDULED_TASK_NAMESPACE = "9d78e746-8f2d-4a13-9c65-873b2e534120";

export function createScheduledTaskId(
  scheduleId: string,
  scheduledDate: string,
): string {
  return v5(`${scheduleId}:${scheduledDate}`, SCHEDULED_TASK_NAMESPACE);
}
