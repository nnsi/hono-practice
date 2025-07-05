import {
  activityDebts,
  activityGoals,
  activityLogs,
} from "@infra/drizzle/schema";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
import { and, between, eq, isNull, sql } from "drizzle-orm";

import type { GoalStatsResponse } from "@dtos/response";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type GoalQueryService = {
  getDebtGoalStats: (
    userId: string,
    goalId: string,
  ) => Promise<GoalStatsResponse>;
  getMonthlyGoalStats: (
    userId: string,
    goalId: string,
  ) => Promise<GoalStatsResponse>;
  withTx: (tx: QueryExecutor) => GoalQueryService;
};

export function newGoalQueryService(db: QueryExecutor): GoalQueryService {
  return {
    getDebtGoalStats: getDebtGoalStats(db),
    getMonthlyGoalStats: getMonthlyGoalStats(db),
    withTx: (tx) => newGoalQueryService(tx),
  };
}

function getDebtGoalStats(db: QueryExecutor) {
  return async (userId: string, goalId: string): Promise<GoalStatsResponse> => {
    // まず負債目標の詳細を取得
    const goal = await db
      .select()
      .from(activityDebts)
      .where(
        and(
          eq(activityDebts.id, goalId),
          eq(activityDebts.userId, userId),
          isNull(activityDebts.deletedAt),
        ),
      )
      .execute();

    if (goal.length === 0) {
      throw new Error("Goal not found");
    }

    const debtGoal = goal[0];
    const today = dayjs().format("YYYY-MM-DD");
    const startDate = debtGoal.startDate;
    const endDate = debtGoal.endDate || today;
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
          eq(activityLogs.activityId, debtGoal.activityId),
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
      Number(debtGoal.dailyTargetQuantity),
    );

    // 日次記録の生成（期間内のすべての日を含む）
    const dailyRecords = generateDailyRecords(
      startDate,
      actualEndDate,
      dailyLogs,
      Number(debtGoal.dailyTargetQuantity),
    );

    return {
      goalType: "debt",
      goalId,
      startDate,
      endDate: actualEndDate,
      dailyRecords,
      stats,
    };
  };
}

function getMonthlyGoalStats(db: QueryExecutor) {
  return async (userId: string, goalId: string): Promise<GoalStatsResponse> => {
    // まず月次目標の詳細を取得
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

    const monthlyGoal = goal[0];
    const targetMonth = monthlyGoal.targetMonth; // YYYY-MM形式
    const startDate = `${targetMonth}-01`;
    const endOfMonth = dayjs(startDate).endOf("month").format("YYYY-MM-DD");
    const today = dayjs().format("YYYY-MM-DD");
    const endDate = endOfMonth < today ? endOfMonth : today;

    // 期間内のactivityLogsを取得（日付ごとに集計）
    const dailyLogs = await db
      .select({
        date: activityLogs.date,
        totalQuantity: sql<number>`COALESCE(SUM(${activityLogs.quantity}), 0)`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.activityId, monthlyGoal.activityId),
          between(activityLogs.date, startDate, endDate),
          isNull(activityLogs.deletedAt),
        ),
      )
      .groupBy(activityLogs.date)
      .orderBy(activityLogs.date)
      .execute();

    // 月次目標の日割り目標を計算
    const daysInMonth = dayjs(startDate).daysInMonth();
    const dailyTarget = Number(monthlyGoal.targetQuantity) / daysInMonth;

    // 統計情報を計算
    const stats = calculateStats(dailyLogs, dailyTarget);

    // 日次記録の生成（累積での達成判定）
    const dailyRecords = generateMonthlyDailyRecords(
      startDate,
      endDate,
      dailyLogs,
      dailyTarget,
    );

    return {
      goalType: "monthly_target",
      goalId,
      startDate,
      endDate,
      dailyRecords,
      stats,
    };
  };
}

// 統計情報の計算
function calculateStats(
  dailyLogs: { date: string; totalQuantity: number }[],
  dailyTarget: number,
) {
  if (dailyLogs.length === 0) {
    return {
      average: 0,
      max: 0,
      maxConsecutiveDays: 0,
      achievedDays: 0,
    };
  }

  const quantities = dailyLogs.map((log) => Number(log.totalQuantity));
  const sum = quantities.reduce((acc, val) => acc + val, 0);
  const average = sum / dailyLogs.length;
  const max = Math.max(...quantities);

  // 達成日数を計算
  const achievedDays = dailyLogs.filter(
    (log) => Number(log.totalQuantity) >= dailyTarget,
  ).length;

  // 最大連続日数を計算
  const maxConsecutiveDays = calculateMaxConsecutiveDays(dailyLogs);

  return {
    average: Math.round(average * 100) / 100,
    max,
    maxConsecutiveDays,
    achievedDays,
  };
}

// 最大連続活動日数の計算
function calculateMaxConsecutiveDays(
  dailyLogs: { date: string; totalQuantity: number }[],
): number {
  if (dailyLogs.length === 0) return 0;

  const logMap = new Map(dailyLogs.map((log) => [log.date, log.totalQuantity]));

  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let currentDate = dayjs(dailyLogs[0].date);
  const endDate = dayjs(dailyLogs[dailyLogs.length - 1].date);

  while (currentDate.isSameOrBefore(endDate)) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const quantity = Number(logMap.get(dateStr) || 0);

    if (quantity > 0) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }

    currentDate = currentDate.add(1, "day");
  }

  return maxConsecutive;
}

// 日次記録の生成（負債目標用）
function generateDailyRecords(
  startDate: string,
  endDate: string,
  dailyLogs: { date: string; totalQuantity: number }[],
  dailyTarget: number,
) {
  const logMap = new Map(dailyLogs.map((log) => [log.date, log.totalQuantity]));

  const records = [];
  let currentDate = dayjs(startDate);
  const end = dayjs(endDate);

  while (currentDate.isSameOrBefore(end)) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const quantity = Number(logMap.get(dateStr) || 0);

    records.push({
      date: dateStr,
      quantity,
      achieved: quantity >= dailyTarget,
    });

    currentDate = currentDate.add(1, "day");
  }

  return records;
}

// 日次記録の生成（月次目標用 - 累積での達成判定）
function generateMonthlyDailyRecords(
  startDate: string,
  endDate: string,
  dailyLogs: { date: string; totalQuantity: number }[],
  dailyTarget: number,
) {
  const logMap = new Map(dailyLogs.map((log) => [log.date, log.totalQuantity]));

  const records = [];
  let currentDate = dayjs(startDate);
  const end = dayjs(endDate);
  let cumulativeQuantity = 0;

  while (currentDate.isSameOrBefore(end)) {
    const dateStr = currentDate.format("YYYY-MM-DD");
    const quantity = Number(logMap.get(dateStr) || 0);
    cumulativeQuantity += quantity;

    // 経過日数での目標累計
    const dayNumber = currentDate.diff(dayjs(startDate), "day") + 1;
    const targetCumulative = dailyTarget * dayNumber;

    records.push({
      date: dateStr,
      quantity,
      achieved: cumulativeQuantity >= targetCumulative,
    });

    currentDate = currentDate.add(1, "day");
  }

  return records;
}
