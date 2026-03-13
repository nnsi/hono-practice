import type { DayTargets } from "./dayTargets";
import { getDailyTargetForDate } from "./dayTargets";
import { type FreezePeriod, calculateGoalBalance } from "./goalBalance";

type GoalInput = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  debtCap?: number | null;
  dayTargets?: DayTargets | null;
};

type LogEntry = { date: string; quantity: number | null };

export type DebtFeedbackResult = {
  /** 複数ゴール時の区別用ラベル（description or target値） */
  goalLabel: string | null;
  balanceBefore: number;
  balanceAfter: number;
  dailyTarget: number;
  quantityRecorded: number;
  /** 今日の記録量が目標を達成した */
  targetAchievedToday: boolean;
  /** 負債が完済された（負→0以上） */
  debtCleared: boolean;
  /** 負債が減少した（負→負だが改善） */
  debtReduced: boolean;
  /** 何もしなかった場合と比較して節約できた負債量 */
  savedAmount: number;
  /** debt capにより免除された負債量 */
  debtCapSaved: number;
};

/**
 * 記録直後のDebtフィードバックを計算する。
 *
 * @param goal 対象ゴール
 * @param logsBefore 記録前の全ログ（新しい記録を含まない）
 * @param quantityRecorded 今回の記録量
 * @param date 記録の日付 (YYYY-MM-DD)
 * @param today 今日の日付 (YYYY-MM-DD)
 * @param freezePeriods フリーズ期間
 */
export function calculateDebtFeedback(
  goal: GoalInput,
  logsBefore: LogEntry[],
  quantityRecorded: number,
  date: string,
  today: string,
  freezePeriods: FreezePeriod[] = [],
): DebtFeedbackResult {
  const before = calculateGoalBalance(goal, logsBefore, today, freezePeriods);

  const logsAfter: LogEntry[] = [
    ...logsBefore,
    { date, quantity: quantityRecorded },
  ];
  const after = calculateGoalBalance(goal, logsAfter, today, freezePeriods);

  const balanceBefore = before.currentBalance;
  const balanceAfter = after.currentBalance;

  // 今日の記録量を集計
  let todayActual = quantityRecorded;
  for (const log of logsBefore) {
    if (log.date === date) {
      todayActual += log.quantity ?? 0;
    }
  }

  const dailyTargetForDate = getDailyTargetForDate(
    goal.dailyTargetQuantity,
    goal.dayTargets,
    date,
  );
  const targetAchievedToday =
    dailyTargetForDate > 0 ? todayActual >= dailyTargetForDate : true;
  const debtCleared = balanceBefore < 0 && balanceAfter >= 0;
  const debtReduced =
    balanceBefore < 0 && balanceAfter < 0 && balanceAfter > balanceBefore;

  // savedAmount: 何もしなかった場合より何単位分マシか
  // = 今回記録した量そのもの（ただし cap が効いている場合は減る）
  const savedAmount = balanceAfter - balanceBefore;

  // debtCapSaved: cap がなかった場合の rawBalance との差
  const debtCapSaved = after.debtCapped
    ? after.currentBalance - after.rawBalance
    : 0;

  return {
    goalLabel: null,
    balanceBefore,
    balanceAfter,
    dailyTarget: getDailyTargetForDate(
      goal.dailyTargetQuantity,
      goal.dayTargets,
      date,
    ),
    quantityRecorded,
    targetAchievedToday,
    debtCleared,
    debtReduced,
    savedAmount,
    debtCapSaved,
  };
}
