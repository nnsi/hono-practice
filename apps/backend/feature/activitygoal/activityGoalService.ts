import { getServerTodayInJst } from "@backend/lib/dayjs";
import { generateDateRange } from "@backend/utils/dateUtils";
import {
  type FreezePeriod,
  calculateGoalBalance,
} from "@packages/domain/goal/goalBalance";
import type {
  ActivityGoal,
  GoalBalance,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityLogRepository, ActivityLogSummary } from "../activityLog";
import { adjustDailyTarget, getInactiveDates } from "./activityGoalAuxService";
import { prefetchFreezePeriods, toFreezePeriods } from "./activityGoalPrefetch";
import { filterLogsByActivity } from "./filterLogsByActivity";
import type { GoalFreezePeriodRepository } from "./goalFreezePeriodRepository";

export type ActivityGoalService = {
  calculateCurrentBalance(
    userId: UserId,
    goal: ActivityGoal,
    calculateDate?: string,
    prefetchedLogs?: ActivityLogSummary[],
    prefetchedFreezePeriods?: FreezePeriod[],
  ): Promise<GoalBalance>;

  prefetchFreezePeriods(
    userId: UserId,
    goals: ActivityGoal[],
  ): Promise<Map<string, FreezePeriod[]>>;

  getBalanceHistory(
    userId: UserId,
    goal: ActivityGoal,
    fromDate: string,
    toDate: string,
  ): Promise<GoalBalance[]>;

  adjustDailyTarget(
    goal: ActivityGoal,
    newTarget: number,
    effectiveDate: string,
  ): Promise<ActivityGoal>;

  getInactiveDates(
    userId: UserId,
    goal: ActivityGoal,
    prefetchedLogs?: ActivityLogSummary[],
    clientDate?: string,
  ): Promise<string[]>;
};

export function newActivityGoalService(
  activityLogRepo: ActivityLogRepository,
  freezePeriodRepo: GoalFreezePeriodRepository,
): ActivityGoalService {
  return {
    calculateCurrentBalance: calculateCurrentBalance(
      activityLogRepo,
      freezePeriodRepo,
    ),
    prefetchFreezePeriods: prefetchFreezePeriods(freezePeriodRepo),
    getBalanceHistory: getBalanceHistory(activityLogRepo, freezePeriodRepo),
    adjustDailyTarget: adjustDailyTarget(),
    getInactiveDates: getInactiveDates(activityLogRepo),
  };
}

function calculateCurrentBalance(
  activityLogRepo: ActivityLogRepository,
  freezePeriodRepo: GoalFreezePeriodRepository,
) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    calculateDate: string = getServerTodayInJst(),
    prefetchedLogs?: ActivityLogSummary[],
    prefetchedFreezePeriods?: FreezePeriod[],
  ): Promise<GoalBalance> => {
    const logs = prefetchedLogs
      ? filterLogsByActivity(prefetchedLogs, goal.activityId)
      : await getActivityLogsForGoal(
          activityLogRepo,
          userId,
          goal,
          calculateDate,
        );

    const freezePeriods =
      prefetchedFreezePeriods ??
      toFreezePeriods(
        await freezePeriodRepo.getFreezePeriodsByGoalIds(userId, [goal.id]),
      );

    return calculateGoalBalance(goal, logs, calculateDate, freezePeriods);
  };
}

async function getActivityLogsForGoal(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  goal: ActivityGoal,
  calculateDate: string,
): Promise<{ date: string; quantity: number | null }[]> {
  const effectiveEnd =
    goal.endDate && calculateDate > goal.endDate ? goal.endDate : calculateDate;

  const logs = await activityLogRepo.getActivityLogSummariesByUserIdAndDate(
    userId,
    goal.startDate,
    effectiveEnd,
  );

  return filterLogsByActivity(logs, goal.activityId);
}

function getBalanceHistory(
  activityLogRepo: ActivityLogRepository,
  freezePeriodRepo: GoalFreezePeriodRepository,
) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    fromDate: string,
    toDate: string,
  ): Promise<GoalBalance[]> => {
    const balances: GoalBalance[] = [];
    const freezePeriods = toFreezePeriods(
      await freezePeriodRepo.getFreezePeriodsByGoalIds(userId, [goal.id]),
    );

    for (const dateStr of generateDateRange(fromDate, toDate)) {
      const balance = await calculateCurrentBalance(
        activityLogRepo,
        freezePeriodRepo,
      )(userId, goal, dateStr, undefined, freezePeriods);
      balances.push(balance);
    }

    return balances;
  };
}
