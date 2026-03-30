import {
  type DebtFeedbackResult,
  calculateDebtFeedback,
} from "@packages/domain/goal/goalDebtFeedback";
import { getToday } from "@packages/frontend-shared/utils/dateUtils";

import { activityLogRepository } from "../../repositories/activityLogRepository";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../../repositories/goalRepository";

export async function computeDebtFeedbackForAllGoals(
  activityId: string,
  quantityRecorded: number,
  date: string,
): Promise<DebtFeedbackResult[]> {
  if (quantityRecorded <= 0) return [];

  const today = getToday();

  const allGoals = await goalRepository.getAllGoals();
  const activeGoals = allGoals.filter(
    (g) =>
      g.activityId === activityId &&
      g.dailyTargetQuantity > 0 &&
      g.deletedAt == null &&
      g.isActive,
  );

  if (activeGoals.length === 0) return [];

  const results: DebtFeedbackResult[] = [];

  for (const goal of activeGoals) {
    // Skip goals whose date range doesn't cover the recording date
    if (date < goal.startDate) continue;
    if (goal.endDate && date > goal.endDate) continue;

    const endDate = goal.endDate ?? today;
    const logs = await activityLogRepository.getActivityLogsBetween(
      goal.startDate,
      endDate,
    );
    const goalLogs = logs
      .filter((l) => l.activityId === activityId)
      .map((l) => ({ date: l.date, quantity: l.quantity }));

    const freezePeriods =
      await goalFreezePeriodRepository.getFreezePeriodsByGoalId(goal.id);
    const freezePeriodsInput = freezePeriods.map((fp) => ({
      startDate: fp.startDate,
      endDate: fp.endDate,
    }));

    const result = calculateDebtFeedback(
      goal,
      goalLogs,
      quantityRecorded,
      date,
      today,
      freezePeriodsInput,
    );

    result.goalLabel =
      activeGoals.length > 1
        ? goal.description || `目標${goal.dailyTargetQuantity}/日`
        : null;

    results.push(result);
  }

  return results;
}
