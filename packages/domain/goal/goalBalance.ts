import dayjs from "dayjs";

type GoalBalanceInput = {
  dailyTargetQuantity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  debtCap?: number | null; // null or undefined = no cap
};

type LogEntry = { date: string; quantity: number | null };

export type FreezePeriod = {
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // null = open-ended
};

export type GoalBalanceResult = {
  currentBalance: number;
  totalTarget: number;
  totalActual: number;
  dailyTarget: number;
  daysActive: number;
  lastCalculatedDate: string;
  rawBalance: number;
  debtCapped: boolean;
};

/** フリーズ期間を除外した有効日数を算出する */
export function countActiveDays(
  start: string,
  end: string,
  freezePeriods: FreezePeriod[],
): number {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isAfter(e)) return 0;

  const totalDays = e.diff(s, "day") + 1;

  // フリーズ期間がなければ高速パス
  if (freezePeriods.length === 0) return totalDays;

  // フリーズ期間と [start, end] の重なり日数を区間演算で算出
  let frozenDays = 0;
  for (const fp of freezePeriods) {
    const fpStart = fp.startDate > start ? fp.startDate : start;
    const fpEnd =
      fp.endDate == null ? end : fp.endDate < end ? fp.endDate : end;
    if (fpStart <= fpEnd) {
      frozenDays += dayjs(fpEnd).diff(dayjs(fpStart), "day") + 1;
    }
  }

  return Math.max(totalDays - frozenDays, 0);
}

/** ゴールのバランス（貯金/負債）を計算する純粋関数 */
export function calculateGoalBalance(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
  freezePeriods: FreezePeriod[] = [],
): GoalBalanceResult {
  // endDateが設定されていて、todayがendDateを超えている場合はendDateまでで計算
  const effectiveEnd =
    goal.endDate && today > goal.endDate ? goal.endDate : today;

  // フリーズ期間を考慮した有効日数
  const daysActive = countActiveDays(
    goal.startDate,
    effectiveEnd,
    freezePeriods,
  );

  const totalTarget = daysActive * goal.dailyTargetQuantity;

  // ログから実績を集計（startDate〜effectiveEnd範囲内のみ）
  // フリーズ中のログも totalActual にカウント（仕様: フリーズ中の記録は貯金）
  let totalActual = 0;
  for (const log of logs) {
    if (log.date >= goal.startDate && log.date <= effectiveEnd) {
      totalActual += log.quantity ?? 0;
    }
  }

  const rawBalance = totalActual - totalTarget;

  // Debt キャップ適用
  let currentBalance = rawBalance;
  let debtCapped = false;
  if (goal.debtCap != null && rawBalance < 0) {
    const cappedDebt = -goal.debtCap;
    if (rawBalance < cappedDebt) {
      currentBalance = cappedDebt;
      debtCapped = true;
    }
  }

  return {
    currentBalance,
    totalTarget,
    totalActual,
    dailyTarget: goal.dailyTargetQuantity,
    daysActive,
    lastCalculatedDate: effectiveEnd,
    rawBalance,
    debtCapped,
  };
}
