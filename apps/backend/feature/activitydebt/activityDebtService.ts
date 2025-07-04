import {
  formatDateInTimezone,
  getCurrentDateInTimezone,
  getDaysBetweenInTimezone,
} from "@backend/utils/timezone";

import type { ActivityLogRepository } from "../activityLog";
import type {
  ActivityDebt,
  ActivityId,
  ActivityLog,
  DebtBalance,
  UserId,
} from "@backend/domain";

export type ActivityDebtService = {
  calculateCurrentBalance(
    userId: UserId,
    debt: ActivityDebt,
    calculateDate?: string,
  ): Promise<DebtBalance>;

  getBalanceHistory(
    userId: UserId,
    debt: ActivityDebt,
    fromDate: string,
    toDate: string,
  ): Promise<DebtBalance[]>;

  adjustDailyTarget(
    debt: ActivityDebt,
    newTarget: number,
    effectiveDate: string,
  ): Promise<ActivityDebt>;
};

export function newActivityDebtService(
  activityLogRepo: ActivityLogRepository,
): ActivityDebtService {
  return {
    calculateCurrentBalance: calculateCurrentBalance(activityLogRepo),
    getBalanceHistory: getBalanceHistory(activityLogRepo),
    adjustDailyTarget: adjustDailyTarget(),
  };
}

function calculateCurrentBalance(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    debt: ActivityDebt,
    calculateDate: string = getCurrentDateInTimezone(),
  ): Promise<DebtBalance> => {
    // 1. 終了日が設定されていて、計算日が終了日を超えている場合は終了日までで計算
    const effectiveCalculateDate =
      debt.endDate && calculateDate > debt.endDate
        ? debt.endDate
        : calculateDate;

    // 2. 開始日から計算日までの日数を計算（JST基準）
    // 開始日より前の場合は0日として扱う
    const daysPassed =
      debt.startDate > effectiveCalculateDate
        ? 0
        : getDaysBetweenInTimezone(debt.startDate, effectiveCalculateDate);

    const activeDays = Math.max(0, daysPassed);

    // 3. 累積負債を計算
    const totalDebt = activeDays * debt.dailyTargetQuantity;

    // 4. 実際の活動量を取得（effectiveCalculateDateまでの期間で計算）
    const actualQuantity = await getActivityQuantityInPeriod(
      activityLogRepo,
      userId,
      debt.activityId,
      debt.startDate,
      effectiveCalculateDate,
    );

    // 5. 残高計算（負の値が負債、正の値が貯金）
    const currentBalance = actualQuantity - totalDebt;

    return {
      currentBalance,
      totalDebt,
      totalActual: actualQuantity,
      dailyTarget: debt.dailyTargetQuantity,
      daysActive: activeDays,
      lastCalculatedDate: effectiveCalculateDate,
    };
  };
}

function getBalanceHistory(activityLogRepo: ActivityLogRepository) {
  return async (
    userId: UserId,
    debt: ActivityDebt,
    fromDate: string,
    toDate: string,
  ): Promise<DebtBalance[]> => {
    const balances: DebtBalance[] = [];
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
        debt,
        dateStr,
      );
      balances.push(balance);
    }

    return balances;
  };
}

function adjustDailyTarget() {
  return async (
    debt: ActivityDebt,
    newTarget: number,
    _effectiveDate: string,
  ): Promise<ActivityDebt> => {
    // 実際の実装では、過去の負債を保持しつつ新しい目標値を適用する
    // より複雑なロジックが必要になる場合があります
    if (debt.type !== "persisted") {
      throw new Error("Cannot adjust target for non-persisted debt");
    }

    return {
      ...debt,
      dailyTargetQuantity: newTarget,
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
  // 既存のgetActivityLogsByUserIdAndDateメソッドを使用
  const fromDate = new Date(startDate);
  const toDate = new Date(endDate);

  const logs = await activityLogRepo.getActivityLogsByUserIdAndDate(
    userId,
    fromDate,
    toDate,
  );

  // 指定されたactivityIdのログのみフィルタリングして、quantityの合計を計算
  return logs
    .filter((log: ActivityLog) => log.activity.id === activityId)
    .reduce((total: number, log: ActivityLog) => {
      return total + (log.quantity || 0);
    }, 0);
}
