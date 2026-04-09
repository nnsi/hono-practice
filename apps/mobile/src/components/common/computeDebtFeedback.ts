import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";
import {
  type DebtFeedbackDataSource,
  computeDebtFeedbackForActivity,
} from "@packages/frontend-shared/hooks/computeDebtFeedback";

import { activityLogRepository } from "../../repositories/activityLogRepository";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../../repositories/goalRepository";

const sqliteDataSource: DebtFeedbackDataSource = {
  async getActiveGoalsForActivity(activityId) {
    const allGoals = await goalRepository.getAllGoals();
    return allGoals.filter(
      (g) =>
        g.activityId === activityId &&
        g.dailyTargetQuantity > 0 &&
        g.deletedAt == null &&
        g.isActive,
    );
  },
  async getActivityLogs(activityId, startDate, endDate) {
    const logs = await activityLogRepository.getActivityLogsBetween(
      startDate,
      endDate,
    );
    return logs
      .filter((l) => l.activityId === activityId)
      .map((l) => ({ date: l.date, quantity: l.quantity }));
  },
  async getFreezePeriods(goalId) {
    const periods =
      await goalFreezePeriodRepository.getFreezePeriodsByGoalId(goalId);
    return periods.map((fp) => ({
      startDate: fp.startDate,
      endDate: fp.endDate,
    }));
  },
};

export async function computeDebtFeedbackForAllGoals(
  activityId: string,
  quantityRecorded: number,
  date: string,
): Promise<DebtFeedbackResult[]> {
  return computeDebtFeedbackForActivity(
    activityId,
    quantityRecorded,
    date,
    sqliteDataSource,
  );
}
