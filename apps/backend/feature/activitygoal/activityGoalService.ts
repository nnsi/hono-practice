import dayjs from "@backend/lib/dayjs";
import { generateDateRange } from "@backend/utils/dateUtils";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import type {
  ActivityGoal,
  GoalBalance,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityLogRepository, ActivityLogSummary } from "../activityLog";
import { adjustDailyTarget, getInactiveDates } from "./activityGoalAuxService";

export type ActivityGoalService = {
  calculateCurrentBalance(
    userId: UserId,
    goal: ActivityGoal,
    calculateDate?: string,
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<GoalBalance>;

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
): ActivityGoalService {
  return {
    calculateCurrentBalance: calculateCurrentBalance(activityLogRepo),
    getBalanceHistory: getBalanceHistory(activityLogRepo),
    adjustDailyTarget: adjustDailyTarget(),
    getInactiveDates: getInactiveDates(activityLogRepo),
  };
}

/**
 * 指定ユーザーの全ゴールに必要なactivity-logsを一括取得する。
 * 各ゴールのstartDate〜todayの最大範囲をカバーする1回のクエリで取得。
 */
export async function prefetchActivityLogs(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  goals: ActivityGoal[],
  clientDate?: string,
): Promise<ActivityLogSummary[]> {
  if (goals.length === 0) return [];

  const today = clientDate ?? dayjs().format("YYYY-MM-DD");

  let minStart = goals[0].startDate;
  let maxEnd = today;
  for (const goal of goals) {
    if (goal.startDate < minStart) minStart = goal.startDate;
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;
    if (endDate > maxEnd) maxEnd = endDate;
  }

  return activityLogRepo.getActivityLogSummariesByUserIdAndDate(
    userId,
    minStart,
    maxEnd,
  );
}

function filterLogsByActivity(
  logs: ActivityLogSummary[],
  activityId: ActivityGoal["activityId"],
): { date: string; quantity: number | null }[] {
  return logs
    .filter((l) => l.activityId === activityId)
    .map((l) => ({ date: l.date, quantity: l.quantity }));
}

function calculateCurrentBalance(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    calculateDate: string = dayjs().format("YYYY-MM-DD"),
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<GoalBalance> => {
    const logs = prefetchedLogs
      ? filterLogsByActivity(prefetchedLogs, goal.activityId)
      : await getActivityLogsForGoal(
          activityLogRepo,
          userId,
          goal,
          calculateDate,
        );

    return calculateGoalBalance(goal, logs, calculateDate);
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

function getBalanceHistory(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    fromDate: string,
    toDate: string,
  ): Promise<GoalBalance[]> => {
    const balances: GoalBalance[] = [];

    for (const dateStr of generateDateRange(fromDate, toDate)) {
      const balance = await calculateCurrentBalance(activityLogRepo)(
        userId,
        goal,
        dateStr,
      );
      balances.push(balance);
    }

    return balances;
  };
}
