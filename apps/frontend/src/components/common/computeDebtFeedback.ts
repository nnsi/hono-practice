import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";
import {
  type DebtFeedbackDataSource,
  computeDebtFeedbackForActivity,
} from "@packages/frontend-shared/hooks/computeDebtFeedback";

import { db } from "../../db/schema";

const dexieDataSource: DebtFeedbackDataSource = {
  async getActiveGoalsForActivity(activityId) {
    return db.goals
      .where("activityId")
      .equals(activityId)
      .filter(
        (g) => g.deletedAt === null && g.isActive && g.dailyTargetQuantity > 0,
      )
      .toArray();
  },
  async getActivityLogs(activityId, startDate, endDate) {
    return db.activityLogs
      .where("activityId")
      .equals(activityId)
      .filter(
        (l) => l.deletedAt === null && l.date >= startDate && l.date <= endDate,
      )
      .toArray();
  },
  async getFreezePeriods(goalId) {
    return db.goalFreezePeriods
      .where("goalId")
      .equals(goalId)
      .filter((fp) => fp.deletedAt === null)
      .toArray();
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
    dexieDataSource,
  );
}
