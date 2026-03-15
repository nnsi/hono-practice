import {
  type DebtFeedbackResult,
  calculateDebtFeedback,
} from "@packages/domain/goal/goalDebtFeedback";
import dayjs from "dayjs";

import { db } from "../../db/schema";

/**
 * あるアクティビティに紐づく全アクティブゴールの DebtFeedback を計算する。
 * 表示すべきフィードバックがなければ空配列を返す。
 */
export async function computeDebtFeedbackForActivity(
  activityId: string,
  quantityRecorded: number,
  date: string,
): Promise<DebtFeedbackResult[]> {
  if (quantityRecorded <= 0) return [];

  const today = dayjs().format("YYYY-MM-DD");

  const goals = await db.goals
    .where("activityId")
    .equals(activityId)
    .filter(
      (g) => g.deletedAt === null && g.isActive && g.dailyTargetQuantity > 0,
    )
    .toArray();

  if (goals.length === 0) return [];

  const results: DebtFeedbackResult[] = [];

  for (const goal of goals) {
    const effectiveEnd =
      goal.endDate && today > goal.endDate ? goal.endDate : today;
    const logsBefore = await db.activityLogs
      .where("activityId")
      .equals(activityId)
      .filter(
        (l) =>
          l.deletedAt === null &&
          l.date >= goal.startDate &&
          l.date <= effectiveEnd,
      )
      .toArray();

    const freezePeriods = await db.goalFreezePeriods
      .where("goalId")
      .equals(goal.id)
      .filter((fp) => fp.deletedAt === null)
      .toArray();

    const result = calculateDebtFeedback(
      goal,
      logsBefore.map((l) => ({ date: l.date, quantity: l.quantity })),
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
