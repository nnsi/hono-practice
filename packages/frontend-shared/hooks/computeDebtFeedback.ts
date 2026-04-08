import {
  type DebtFeedbackResult,
  calculateDebtFeedback,
} from "@packages/domain/goal/goalDebtFeedback";

import { getToday } from "../utils/dateUtils";

type GoalForFeedback = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  description?: string;
  debtCap?: number | null;
};

type LogEntry = { date: string; quantity: number | null };
type FreezePeriodEntry = { startDate: string; endDate: string | null };

export type DebtFeedbackDataSource = {
  getActiveGoalsForActivity: (activityId: string) => Promise<GoalForFeedback[]>;
  getActivityLogs: (
    activityId: string,
    startDate: string,
    endDate: string,
  ) => Promise<LogEntry[]>;
  getFreezePeriods: (goalId: string) => Promise<FreezePeriodEntry[]>;
};

export async function computeDebtFeedbackForActivity(
  activityId: string,
  quantityRecorded: number,
  date: string,
  dataSource: DebtFeedbackDataSource,
): Promise<DebtFeedbackResult[]> {
  if (quantityRecorded <= 0) return [];

  const today = getToday();

  const goals = await dataSource.getActiveGoalsForActivity(activityId);
  if (goals.length === 0) return [];

  const results: DebtFeedbackResult[] = [];

  for (const goal of goals) {
    if (date < goal.startDate) continue;
    if (goal.endDate && date > goal.endDate) continue;

    const effectiveEnd =
      goal.endDate && today > goal.endDate ? goal.endDate : today;

    const logs = await dataSource.getActivityLogs(
      activityId,
      goal.startDate,
      effectiveEnd,
    );

    const freezePeriods = await dataSource.getFreezePeriods(goal.id);

    const result = calculateDebtFeedback(
      goal,
      logs.map((l) => ({ date: l.date, quantity: l.quantity })),
      quantityRecorded,
      date,
      today,
      freezePeriods.map((fp) => ({
        startDate: fp.startDate,
        endDate: fp.endDate,
      })),
    );

    result.goalLabel =
      goals.length > 1
        ? goal.description || `目標${goal.dailyTargetQuantity}/日`
        : null;

    results.push(result);
  }

  return results;
}
