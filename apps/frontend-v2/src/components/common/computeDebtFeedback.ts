import {
  type DebtFeedbackResult,
  calculateDebtFeedback,
} from "@packages/domain/goal/goalDebtFeedback";
import dayjs from "dayjs";

import { db } from "../../db/schema";

/**
 * あるアクティビティに紐づくアクティブゴールを参照し、
 * 記録前の状態から DebtFeedback を計算する。
 *
 * 最初にマッチしたゴール（dailyTargetQuantity > 0）の結果を返す。
 * 該当ゴールがなければ null。
 */
export async function computeDebtFeedbackForActivity(
  activityId: string,
  quantityRecorded: number,
  date: string,
): Promise<DebtFeedbackResult | null> {
  if (quantityRecorded <= 0) return null;

  const today = dayjs().format("YYYY-MM-DD");

  const goals = await db.goals
    .where("activityId")
    .equals(activityId)
    .filter(
      (g) => g.deletedAt === null && g.isActive && g.dailyTargetQuantity > 0,
    )
    .toArray();

  if (goals.length === 0) return null;

  // Use the first matching goal
  const goal = goals[0];

  // Fetch all logs for this activity within the goal's date range (before the new record)
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

  // Fetch freeze periods for this goal
  const freezePeriods = await db.goalFreezePeriods
    .where("goalId")
    .equals(goal.id)
    .filter((fp) => fp.deletedAt === null)
    .toArray();

  return calculateDebtFeedback(
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
}
