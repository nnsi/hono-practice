import { useCallback, useMemo, useState } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import { getInactiveDates } from "@packages/domain/goal/goalStats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";

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
): StatusBadge {
  if (!goal.isActive) {
    return {
      label: "終了",
      bgClass: "bg-gray-200",
      textClass: "text-gray-600",
    };
  }
  if (balance < 0) {
    return {
      label: "負債あり",
      bgClass: "bg-red-100",
      textClass: "text-red-700",
    };
  }
  if (hasTodayLog) {
    return {
      label: "順調",
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

  // --- やらなかった日付（タブフォーカス時に再読み込み） ---
  const [showInactiveDatesEnabled, setShowInactiveDatesEnabled] =
    useState(false);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("actiko-v2-settings").then((raw) => {
        if (!raw) return;
        try {
          const s = JSON.parse(raw);
          setShowInactiveDatesEnabled(s.showInactiveDates === true);
        } catch {
          // ignore
        }
      });
    }, []),
  );

  const monthStart = useMemo(
    () => dayjs().startOf("month").format("YYYY-MM-DD"),
    [],
  );
  const monthEnd = useMemo(
    () => dayjs().endOf("month").format("YYYY-MM-DD"),
    [],
  );
  const effectiveStart = useMemo(
    () => (goal.startDate > monthStart ? goal.startDate : monthStart),
    [goal.startDate, monthStart],
  );
  const effectiveEnd = useMemo(() => {
    const end =
      goal.endDate && goal.endDate < monthEnd ? goal.endDate : monthEnd;
    return end > today ? today : end;
  }, [goal.endDate, monthEnd, today]);

  const monthLogs = useLiveQuery(["activity_logs"], async () => {
    if (!showInactiveDatesEnabled) return [];
    const sqlDb = await getDatabase();
    return sqlDb.getAllAsync<{ date: string; quantity: number | null }>(
      `SELECT date, quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [goal.activityId, effectiveStart, effectiveEnd],
    );
  }, [goal.activityId, effectiveStart, effectiveEnd, showInactiveDatesEnabled]);

  const inactiveDates = useMemo(() => {
    if (!showInactiveDatesEnabled || !monthLogs) return [];
    const monthGoal = {
      ...goal,
      startDate: effectiveStart,
      endDate: effectiveEnd,
    };
    return getInactiveDates(monthGoal, monthLogs, today);
  }, [
    showInactiveDatesEnabled,
    monthLogs,
    effectiveStart,
    effectiveEnd,
    goal,
    today,
  ]);

  const statusBadge = getStatusBadge(goal, hasTodayLog, localBalance);
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
