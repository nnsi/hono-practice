import type { GoalStatsResponse } from "@dtos/response";
import { activityGoals, activityLogs } from "@infra/drizzle/schema";
import {
  generateDailyRecords,
  calculateGoalStats,
} from "@packages/domain/goal/goalStats";
import dayjs from "dayjs";
import { and, between, eq, isNull, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type GoalQueryService = {
  getGoalStats: (userId: string, goalId: string) => Promise<GoalStatsResponse>;
  withTx: (tx: QueryExecutor) => GoalQueryService;
};

export function newGoalQueryService(db: QueryExecutor): GoalQueryService {
  return {
    getGoalStats: getGoalStats(db),
    withTx: (tx) => newGoalQueryService(tx),
  };
}

function getGoalStats(db: QueryExecutor) {
  return async (userId: string, goalId: string): Promise<GoalStatsResponse> => {
    // まず目標の詳細を取得
    const goal = await db
      .select()
      .from(activityGoals)
      .where(
        and(
          eq(activityGoals.id, goalId),
          eq(activityGoals.userId, userId),
          isNull(activityGoals.deletedAt),
        ),
      )
      .execute();

    if (goal.length === 0) {
      throw new Error("Goal not found");
    }

    const activityGoal = goal[0];
    const today = dayjs().format("YYYY-MM-DD");
    const startDate = activityGoal.startDate;
    const endDate = activityGoal.endDate || today;
    const actualEndDate = endDate < today ? endDate : today;

    // 期間内のactivityLogsを取得（日付ごとに集計）
    const dailyLogs = await db
      .select({
        date: activityLogs.date,
        totalQuantity: sql<number>`COALESCE(SUM(${activityLogs.quantity}), 0)`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.activityId, activityGoal.activityId),
          between(activityLogs.date, startDate, actualEndDate),
          isNull(activityLogs.deletedAt),
        ),
      )
      .groupBy(activityLogs.date)
      .orderBy(activityLogs.date)
      .execute();

    // SQL集計結果を共有関数の入力形式に変換
    const logsForDomain = dailyLogs.map((l) => ({
      date: l.date,
      quantity: l.totalQuantity,
    }));
    const dailyTarget = Number(activityGoal.dailyTargetQuantity);
    const goalForDomain = {
      dailyTargetQuantity: dailyTarget,
      startDate,
      endDate: activityGoal.endDate,
    };

    // 共有純粋関数で統計を計算
    const dailyRecords = generateDailyRecords(
      goalForDomain,
      logsForDomain,
      today,
    );
    const goalStats = calculateGoalStats(dailyRecords);

    return {
      goalId,
      startDate,
      endDate: actualEndDate,
      dailyRecords,
      stats: {
        average: goalStats.average,
        max: goalStats.max,
        maxConsecutiveDays: goalStats.maxConsecutiveDays,
        achievedDays: goalStats.achievedDays,
      },
    };
  };
}
