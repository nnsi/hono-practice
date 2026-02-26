import { useLiveQuery } from "../db/useLiveQuery";
import { activityLogRepository } from "../repositories/activityLogRepository";

export function useActivityLogs(date: string) {
  const logs = useLiveQuery(
    "activity_logs",
    () => activityLogRepository.getActivityLogsByDate(date),
    [date]
  );
  return { logs: logs ?? [] };
}
