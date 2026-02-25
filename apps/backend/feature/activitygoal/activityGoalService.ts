import type { ActivityGoal, GoalBalance } from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import { getInactiveDates as getInactiveDatesShared } from "@packages/domain/goal/goalStats";
import {
  formatDateInTimezone,
  getCurrentDateInTimezone,
} from "@backend/utils/timezone";

import type { ActivityLogRepository, ActivityLogSummary } from "../activityLog";

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
): Promise<ActivityLogSummary[]> {
  if (goals.length === 0) return [];

  const today = getCurrentDateInTimezone();

  // 全ゴールの最小startDateと最大endDateを算出
  let minStart = goals[0].startDate;
  let maxEnd = today;
  for (const goal of goals) {
    if (goal.startDate < minStart) minStart = goal.startDate;
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;
    if (endDate > maxEnd) maxEnd = endDate;
  }

  return activityLogRepo.getActivityLogSummariesByUserIdAndDate(
    userId,
    new Date(minStart),
    new Date(maxEnd),
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
    calculateDate: string = getCurrentDateInTimezone(),
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<GoalBalance> => {
    // ログを取得（prefetchedLogsがあればDBアクセス不要）
    const logs = prefetchedLogs
      ? filterLogsByActivity(prefetchedLogs, goal.activityId)
      : await getActivityLogsForGoal(activityLogRepo, userId, goal, calculateDate);

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
    new Date(goal.startDate),
    new Date(effectiveEnd),
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
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    // 日別に計算
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = formatDateInTimezone(date);
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

function adjustDailyTarget() {
  return async (
    goal: ActivityGoal,
    newTarget: number,
    effectiveDate: string,
  ): Promise<ActivityGoal> => {
    // 実際の実装では、過去の負債を保持しつつ新しい目標値を適用する
    // より複雑なロジックが必要になる場合があります
    if (goal.type !== "persisted") {
      throw new Error("Cannot adjust target for non-persisted goal");
    }

    // 元の目標を非アクティブにして終了日を設定
    const previousDay = new Date(effectiveDate);
    previousDay.setDate(previousDay.getDate() - 1);
    goal.isActive = false;
    goal.endDate = formatDateInTimezone(previousDay);

    // 新しい目標を返す
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

function getInactiveDates(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<string[]> => {
    const today = getCurrentDateInTimezone();
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;

    // 期間内のログを取得（prefetchedLogsがあればDBアクセス不要）
    const allLogs = prefetchedLogs
      ? prefetchedLogs
      : await activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId,
          new Date(goal.startDate),
          new Date(endDate),
        );

    const logs = filterLogsByActivity(allLogs, goal.activityId);

    return getInactiveDatesShared(goal, logs, today);
  };
}
