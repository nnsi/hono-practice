import dayjs from "@backend/lib/dayjs";
import { formatDateString } from "@backend/utils/dateUtils";
import type { ActivityGoal } from "@packages/domain/goal/goalSchema";
import { getInactiveDates as getInactiveDatesShared } from "@packages/domain/goal/goalStats";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityLogRepository, ActivityLogSummary } from "../activityLog";

function filterLogsByActivity(
  logs: ActivityLogSummary[],
  activityId: ActivityGoal["activityId"],
): { date: string; quantity: number | null }[] {
  return logs
    .filter((l) => l.activityId === activityId)
    .map((l) => ({ date: l.date, quantity: l.quantity }));
}

export function adjustDailyTarget() {
  return async (
    goal: ActivityGoal,
    newTarget: number,
    effectiveDate: string,
  ): Promise<ActivityGoal> => {
    if (goal.type !== "persisted") {
      throw new Error("Cannot adjust target for non-persisted goal");
    }

    const previousDay = new Date(effectiveDate);
    previousDay.setDate(previousDay.getDate() - 1);
    goal.isActive = false;
    goal.endDate = formatDateString(previousDay);

    return {
      ...goal,
      type: "new" as const,
      dailyTargetQuantity: newTarget,
      startDate: effectiveDate,
      endDate: null,
      isActive: true,
    };
  };
}

export function getInactiveDates(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    prefetchedLogs?: ActivityLogSummary[],
    clientDate?: string,
  ): Promise<string[]> => {
    const today = clientDate ?? dayjs().format("YYYY-MM-DD");
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;

    const allLogs = prefetchedLogs
      ? prefetchedLogs
      : await activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId,
          goal.startDate,
          endDate,
        );

    const logs = filterLogsByActivity(allLogs, goal.activityId);

    return getInactiveDatesShared(goal, logs, today);
  };
}
