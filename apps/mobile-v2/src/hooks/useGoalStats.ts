import { useMemo } from "react";
import { useLiveQuery } from "../db/useLiveQuery";
import { getDatabase } from "../db/database";
import dayjs from "dayjs";

type GoalStats = {
  totalTarget: number;
  totalActual: number;
  currentBalance: number;
};

export function useGoalStats(
  _goalId: string,
  activityId: string,
  dailyTargetQuantity: number,
  startDate: string,
  endDate: string | null,
): GoalStats {
  const today = dayjs().format("YYYY-MM-DD");
  const effectiveEnd = endDate && endDate < today ? endDate : today;

  const logs = useLiveQuery(
    ["activity_logs", "goals"],
    async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ quantity: number | null }>(
        `SELECT quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
        [activityId, startDate, effectiveEnd],
      );
      return rows;
    },
    [activityId, startDate, effectiveEnd],
  );

  return useMemo(() => {
    if (!logs) return { totalTarget: 0, totalActual: 0, currentBalance: 0 };

    const start = dayjs(startDate);
    const end = dayjs(effectiveEnd);
    const days = end.diff(start, "day") + 1;

    const totalTarget = dailyTargetQuantity * days;
    const totalActual = logs.reduce((sum, log) => sum + (log.quantity ?? 1), 0);
    const currentBalance = totalActual - totalTarget;

    return { totalTarget, totalActual, currentBalance };
  }, [logs, startDate, effectiveEnd, dailyTargetQuantity]);
}
