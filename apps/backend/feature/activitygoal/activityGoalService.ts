import type {
  ActivityGoal,
  ActivityId,
  GoalBalance,
  UserId,
} from "@backend/domain";
import {
  formatDateInTimezone,
  getCurrentDateInTimezone,
  getDaysBetweenInTimezone,
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

function calculateCurrentBalance(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    calculateDate: string = getCurrentDateInTimezone(),
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<GoalBalance> => {
    // 1. 終了日が設定されていて、計算日が終了日を超えている場合は終了日までで計算
    const effectiveCalculateDate =
      goal.endDate && calculateDate > goal.endDate
        ? goal.endDate
        : calculateDate;

    // 2. 開始日から計算日までの日数を計算（JST基準）
    // 開始日より前の場合は0日として扱う
    const daysPassed =
      goal.startDate > effectiveCalculateDate
        ? 0
        : getDaysBetweenInTimezone(goal.startDate, effectiveCalculateDate);

    const activeDays = Math.max(0, daysPassed);

    // 3. 累積目標を計算
    const totalTarget = activeDays * goal.dailyTargetQuantity;

    // 4. 実際の活動量を取得（effectiveCalculateDateまでの期間で計算）
    const actualQuantity = prefetchedLogs
      ? getActivityQuantityFromLogs(
          prefetchedLogs,
          goal.activityId,
          goal.startDate,
          effectiveCalculateDate,
        )
      : await getActivityQuantityInPeriod(
          activityLogRepo,
          userId,
          goal.activityId,
          goal.startDate,
          effectiveCalculateDate,
        );

    // 5. 残高計算（負の値が負債、正の値が貯金）
    const currentBalance = actualQuantity - totalTarget;

    return {
      currentBalance,
      totalTarget,
      totalActual: actualQuantity,
      dailyTarget: goal.dailyTargetQuantity,
      daysActive: activeDays,
      lastCalculatedDate: effectiveCalculateDate,
    };
  };
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

// Helper function: prefetchedLogsから期間内の活動量を集計（DBアクセスなし）
function getActivityQuantityFromLogs(
  logs: ActivityLogSummary[],
  activityId: ActivityId,
  startDate: string,
  endDate: string,
): number {
  let total = 0;
  for (const log of logs) {
    if (
      log.activityId === activityId &&
      log.date >= startDate &&
      log.date <= endDate
    ) {
      total += log.quantity || 0;
    }
  }
  return total;
}

// Helper function: 期間内の活動量を集計（date rangeはDB側でフィルタ済み）
async function getActivityQuantityInPeriod(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  activityId: ActivityId,
  startDate: string,
  endDate: string,
): Promise<number> {
  const fromDate = new Date(startDate);
  const toDate = new Date(endDate);

  const logs = await activityLogRepo.getActivityLogSummariesByUserIdAndDate(
    userId,
    fromDate,
    toDate,
  );

  let total = 0;
  for (const log of logs) {
    if (log.activityId === activityId) {
      total += log.quantity || 0;
    }
  }
  return total;
}

function getInactiveDates(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    prefetchedLogs?: ActivityLogSummary[],
  ): Promise<string[]> => {
    // 計算対象の終了日を決定
    const today = getCurrentDateInTimezone();
    const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;

    // 期間内のログを取得（prefetchedLogsがあればDBアクセス不要）
    const logs = prefetchedLogs
      ? prefetchedLogs
      : await activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId,
          new Date(goal.startDate),
          new Date(endDate),
        );

    // 活動があった日付のセットを作成
    const activeDates = new Set<string>();
    for (const log of logs) {
      if (
        log.activityId === goal.activityId &&
        log.quantity !== null &&
        log.quantity > 0 &&
        log.date >= goal.startDate &&
        log.date <= endDate
      ) {
        activeDates.add(log.date);
      }
    }

    // 期間内の全日付をチェックして、活動がなかった日付を収集
    const inactiveDates: string[] = [];
    const current = new Date(goal.startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = formatDateInTimezone(current);
      if (!activeDates.has(dateStr)) {
        inactiveDates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    return inactiveDates;
  };
}
