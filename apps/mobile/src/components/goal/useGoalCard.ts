import { useMemo } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { useInactiveDates } from "./useInactiveDates";

type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
};

type StatusBadge = { label: string; bgClass: string; textClass: string };

function getStatusBadge(
  goal: GoalForCard,
  hasTodayLog: boolean,
  balance: number,
  // biome-ignore lint: i18next TFunction has complex overloads
  t: (...args: any[]) => string,
): StatusBadge {
  if (!goal.isActive) {
    return {
      label: t("statusEnded"),
      bgClass: "bg-gray-200",
      textClass: "text-gray-600",
    };
  }
  if (balance < 0) {
    return {
      label: t("statusInDebt"),
      bgClass: "bg-red-100",
      textClass: "text-red-700",
    };
  }
  if (hasTodayLog) {
    return {
      label: t("statusOnTrack"),
      bgClass: "bg-green-100",
      textClass: "text-green-700",
    };
  }
  return {
    label: "達成ペース",
    bgClass: "bg-green-50",
    textClass: "text-green-600",
  };
}

export function useGoalCard(goal: GoalForCard) {
  const { t } = useTranslation("goal");
  const today = dayjs().format("YYYY-MM-DD");
  const actualEndDate =
    goal.endDate && goal.endDate < today ? goal.endDate : today;

  const totalDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
    return Math.max(end.diff(start, "day") + 1, 1);
  }, [goal.startDate, goal.endDate]);

  const todayLogCount = useLiveQuery(["activity_logs"], async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM activity_logs
         WHERE activity_id = ? AND date = ? AND deleted_at IS NULL`,
      [goal.activityId, today],
    );
    return row?.cnt ?? 0;
  }, [goal.activityId, today]);
  const hasTodayLog = (todayLogCount ?? 0) > 0;

  const periodLogs = useLiveQuery(["activity_logs"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<{ date: string; quantity: number | null }>(
      `SELECT date, quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [goal.activityId, goal.startDate, actualEndDate],
    );
  }, [goal.activityId, goal.startDate, actualEndDate]);

  const freezePeriods = useLiveQuery(["goal_freeze_periods"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<FreezePeriod>(
      `SELECT start_date as startDate, end_date as endDate
         FROM goal_freeze_periods
         WHERE goal_id = ? AND deleted_at IS NULL`,
      [goal.id],
    );
  }, [goal.id]);

  const isCurrentlyFrozen = useMemo(() => {
    if (!freezePeriods) return false;
    return freezePeriods.some(
      (fp) =>
        fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
    );
  }, [freezePeriods, today]);

  const balance = useMemo(() => {
    return calculateGoalBalance(
      goal,
      periodLogs ?? [],
      today,
      freezePeriods ?? [],
    );
  }, [goal, periodLogs, today, freezePeriods]);

  const localBalance = balance.currentBalance;
  const elapsedDays = balance.daysActive;

  const completionPercent = useMemo(() => {
    if (balance.totalTarget <= 0) return 0;
    return Math.min((balance.totalActual / balance.totalTarget) * 100, 100);
  }, [balance.totalActual, balance.totalTarget]);

  const progressPercent = useMemo(() => {
    if (totalDays === 0) return 0;
    return Math.min((elapsedDays / totalDays) * 100, 100);
  }, [elapsedDays, totalDays]);

  const { showInactiveDatesEnabled, inactiveDates } = useInactiveDates(
    goal,
    today,
  );

  const statusBadge = getStatusBadge(goal, hasTodayLog, localBalance, t);
  const balanceColor = localBalance < 0 ? "text-red-600" : "text-blue-600";

  return {
    today,
    totalDays,
    elapsedDays,
    localBalance,
    balance,
    isCurrentlyFrozen,
    completionPercent,
    progressPercent,
    showInactiveDatesEnabled,
    inactiveDates,
    statusBadge,
    balanceColor,
  };
}
