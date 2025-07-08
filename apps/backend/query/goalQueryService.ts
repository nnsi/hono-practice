import { activityGoals, activityLogs } from "@infra/drizzle/schema";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
import { and, between, eq, isNull, sql } from "drizzle-orm";

import type { GoalStatsResponse } from "@dtos/response";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

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

    // 統計情報を計算
    const stats = calculateStats(
      dailyLogs,
      Number(activityGoal.dailyTargetQuantity),
    );

    // 日次記録の生成（期間内のすべての日を含む）
    const dailyRecords = generateDailyRecords(
      startDate,
      actualEndDate,
      dailyLogs,
      Number(activityGoal.dailyTargetQuantity),
    );

    return {
      goalId,
      startDate,
      endDate: actualEndDate,
      dailyRecords,
      stats,
    };
  };
}

// 統計情報を計算
function calculateStats(
  dailyLogs: { date: string; totalQuantity: number }[],
  dailyTarget: number,
) {
  const achieved = dailyLogs.filter(
    (log) => log.totalQuantity >= dailyTarget,
  ).length;
  const quantities = dailyLogs.map((log) => log.totalQuantity);
  const total = quantities.reduce((sum, q) => sum + q, 0);
  const average = quantities.length > 0 ? total / quantities.length : 0;
  const max = quantities.length > 0 ? Math.max(...quantities) : 0;

  // 最大連続活動日数を計算
  const maxConsecutiveDays = calculateMaxConsecutiveDays(dailyLogs);

  return {
    average: Math.round(average * 10) / 10,
    max,
    maxConsecutiveDays,
    achievedDays: achieved,
  };
}

// 最大連続活動日数を計算（活動量が0より大きい日の連続）
function calculateMaxConsecutiveDays(
  dailyLogs: { date: string; totalQuantity: number }[],
) {
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let lastDate: dayjs.Dayjs | null = null;

  for (const log of dailyLogs) {
    if (log.totalQuantity > 0) {
      const currentDate = dayjs(log.date);
      if (lastDate === null || currentDate.diff(lastDate, "day") === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
      lastDate = currentDate;
    } else {
      currentConsecutive = 0;
      lastDate = null;
    }
  }

  return maxConsecutive;
}

// 日次記録の生成
function generateDailyRecords(
  startDate: string,
  endDate: string,
  dailyLogs: { date: string; totalQuantity: number }[],
  dailyTarget: number,
) {
  const records = [];
  const logMap = new Map(dailyLogs.map((log) => [log.date, log.totalQuantity]));

  let currentDate = dayjs(startDate);
  const end = dayjs(endDate);

  while (currentDate.isSameOrBefore(end)) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const quantity = logMap.get(dateStr) || 0;
    records.push({
      date: dateStr,
      quantity,
      achieved: quantity >= dailyTarget,
    });
    currentDate = currentDate.add(1, "day");
  }

  return records;
}
