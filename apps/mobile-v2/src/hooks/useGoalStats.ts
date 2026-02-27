import { useMemo } from "react";
import dayjs from "dayjs";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import type { GoalBalanceResult } from "@packages/domain/goal/goalBalance";
import {
  generateDailyRecords,
  calculateGoalStats,
} from "@packages/domain/goal/goalStats";
import type { DailyRecord } from "@packages/domain/goal/goalStats";
import { useLiveQuery } from "../db/useLiveQuery";
import { activityLogRepository } from "../repositories/activityLogRepository";

type GoalStatsResult = {
  balance: GoalBalanceResult;
  dailyRecords: DailyRecord[];
  stats: {
    average: number;
    max: number;
    maxConsecutiveDays: number;
    achievedDays: number;
    activeDays: number;
  };
};

export function useGoalStats(
  _goalId: string,
  activityId: string,
  dailyTargetQuantity: number,
  startDate: string,
  endDate: string | null,
): GoalStatsResult {
  const today = dayjs().format("YYYY-MM-DD");
  const effectiveEnd = endDate && endDate < today ? endDate : today;

  const logs = useLiveQuery(
    ["activity_logs", "goals"],
    () => activityLogRepository.getActivityLogsBetween(startDate, effectiveEnd),
    [activityId, startDate, effectiveEnd],
  );

  return useMemo(() => {
    const defaultResult: GoalStatsResult = {
      balance: {
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        dailyTarget: dailyTargetQuantity,
        daysActive: 0,
        lastCalculatedDate: today,
      },
      dailyRecords: [],
      stats: {
        average: 0,
        max: 0,
        maxConsecutiveDays: 0,
        achievedDays: 0,
        activeDays: 0,
      },
    };

    if (!logs) return defaultResult;

    // Filter logs to only this activity
    const activityLogs = logs.filter((l) => l.activityId === activityId);

    const goal = { dailyTargetQuantity, startDate, endDate };

    const balance = calculateGoalBalance(goal, activityLogs, today);
    const dailyRecords = generateDailyRecords(goal, activityLogs, today);
    const stats = calculateGoalStats(dailyRecords);

    return { balance, dailyRecords, stats };
  }, [logs, activityId, dailyTargetQuantity, startDate, endDate, today]);
}
