import { useCallback, useMemo, useState } from "react";

import { getInactiveDates } from "@packages/domain/goal/goalStats";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";

type GoalForInactiveDates = {
  activityId: string;
  startDate: string;
  endDate: string | null;
  dailyTargetQuantity: number;
  isActive: boolean;
  debtCap?: number | null;
};

export function useInactiveDates(goal: GoalForInactiveDates, today: string) {
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

  return { showInactiveDatesEnabled, inactiveDates };
}
