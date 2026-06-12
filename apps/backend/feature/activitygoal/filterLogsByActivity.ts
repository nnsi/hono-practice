import type { ActivityGoal } from "@packages/domain/goal/goalSchema";

import type { ActivityLogSummary } from "../activityLog";

export function filterLogsByActivity(
  logs: ActivityLogSummary[],
  activityId: ActivityGoal["activityId"],
): { date: string; quantity: number | null }[] {
  return logs
    .filter((l) => l.activityId === activityId)
    .map((l) => ({ date: l.date, quantity: l.quantity }));
}
