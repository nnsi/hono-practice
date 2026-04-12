import { useMemo } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import {
  type GoalForCard,
  createUseGoalCard,
} from "@packages/frontend-shared/hooks/useGoalCard";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { useInactiveDates } from "./useInactiveDates";

function useTodayLogCount(activityId: string, today: string) {
  return useLiveQuery(["activity_logs"], async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM activity_logs
         WHERE activity_id = ? AND date = ? AND deleted_at IS NULL`,
      [activityId, today],
    );
    return row?.cnt ?? 0;
  }, [activityId, today]);
}

function usePeriodLogs(activityId: string, startDate: string, endDate: string) {
  return useLiveQuery(["activity_logs"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<{ date: string; quantity: number | null }>(
      `SELECT date, quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [activityId, startDate, endDate],
    );
  }, [activityId, startDate, endDate]);
}

function useFreezePeriods(goalId: string) {
  return useLiveQuery(["goal_freeze_periods"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<FreezePeriod>(
      `SELECT start_date as startDate, end_date as endDate
         FROM goal_freeze_periods
         WHERE goal_id = ? AND deleted_at IS NULL`,
      [goalId],
    );
  }, [goalId]);
}

function useInactiveDatesAdapter(goal: GoalForCard, today: string) {
  return useInactiveDates(goal, today);
}

export const useGoalCard = createUseGoalCard({
  react: { useMemo },
  useTranslation,
  dayjs,
  useTodayLogCount,
  usePeriodLogs,
  useFreezePeriods,
  useInactiveDates: useInactiveDatesAdapter,
});
