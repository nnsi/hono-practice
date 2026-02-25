import dayjs from "dayjs";

type GoalBalanceInput = {
  dailyTargetQuantity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
};

type LogEntry = { date: string; quantity: number | null };

export type GoalBalanceResult = {
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  dailyTarget: number;
  daysActive: number;
  lastCalculatedDate: string;
};

/** ゴールのバランス（貯金/負債）を計算する純粋関数 */
export function calculateGoalBalance(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): GoalBalanceResult {
  // endDateが設定されていて、todayがendDateを超えている場合はendDateまでで計算
  const effectiveEnd =
    goal.endDate && today > goal.endDate ? goal.endDate : today;

  // startDateがeffectiveEndより未来の場合は0日
  const start = dayjs(goal.startDate);
  const end = dayjs(effectiveEnd);
  const daysActive = start.isAfter(end) ? 0 : end.diff(start, "day") + 1;

  const totalTarget = daysActive * goal.dailyTargetQuantity;

  // ログから実績を集計（startDate〜effectiveEnd範囲内のみ）
  let totalActual = 0;
  for (const log of logs) {
    if (log.date >= goal.startDate && log.date <= effectiveEnd) {
      totalActual += log.quantity ?? 0;
    }
  }

  const currentBalance = totalActual - totalTarget;

  return {
    currentBalance,
    totalTarget,
    totalActual,
    dailyTarget: goal.dailyTargetQuantity,
    daysActive,
    lastCalculatedDate: effectiveEnd,
  };
}
