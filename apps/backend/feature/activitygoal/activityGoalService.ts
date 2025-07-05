import {
  formatDateInTimezone,
  getCurrentDateInTimezone,
  getDaysBetweenInTimezone,
} from "@backend/utils/timezone";

import type { ActivityLogRepository } from "../activityLog";
import type {
  ActivityGoal,
  ActivityId,
  ActivityLog,
  GoalBalance,
  UserId,
} from "@backend/domain";

export type ActivityGoalService = {
  calculateCurrentBalance(
    userId: UserId,
    goal: ActivityGoal,
    calculateDate?: string,
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
};

export function newActivityGoalService(
  activityLogRepo: ActivityLogRepository,
): ActivityGoalService {
  return {
    calculateCurrentBalance: calculateCurrentBalance(activityLogRepo),
    getBalanceHistory: getBalanceHistory(activityLogRepo),
    adjustDailyTarget: adjustDailyTarget(),
  };
}

function calculateCurrentBalance(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    goal: ActivityGoal,
    calculateDate: string = getCurrentDateInTimezone(),
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
    const actualQuantity = await getActivityQuantityInPeriod(
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

// Helper function: 期間内の活動量を集計
async function getActivityQuantityInPeriod(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  activityId: ActivityId,
  startDate: string,
  endDate: string,
): Promise<number> {
  // getActivityLogsByUserIdAndDateメソッドを使用
  const fromDate = new Date(startDate);
  const toDate = new Date(endDate);

  const logs = await activityLogRepo.getActivityLogsByUserIdAndDate(
    userId,
    fromDate,
    toDate,
  );

  // nullチェックを追加
  if (!logs) {
    return 0;
  }

  // 指定されたactivityIdのログのみフィルタリングして、quantityの合計を計算
  return logs
    .filter((log: ActivityLog) => log.activity.id === activityId)
    .reduce((total: number, log: ActivityLog) => {
      return total + (log.quantity || 0);
    }, 0);
}
