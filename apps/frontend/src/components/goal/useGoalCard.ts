import { useMemo } from "react";

import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";
import { getInactiveDates } from "@packages/domain/goal/goalStats";
import {
  getEndOfMonth,
  getStartOfMonth,
  getToday,
} from "@packages/frontend-shared/utils/dateUtils";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";
import type { Goal } from "./types";

type StatusBadge = { label: string; className: string };

function getStatusBadge(
  goal: Goal,
  hasTodayLog: boolean,
  balance: number,
  // biome-ignore lint: i18next TFunction has complex overloads
  t: (...args: any[]) => string,
): StatusBadge {
  if (!goal.isActive) {
    return { label: t("statusEnded"), className: "bg-gray-200 text-gray-600" };
  }
  if (balance < 0) {
    return { label: t("statusInDebt"), className: "bg-red-100 text-red-700" };
  }
  if (hasTodayLog) {
    return {
      label: t("statusOnTrack"),
      className: "bg-green-100 text-green-700",
    };
  }
  return { label: "達成ペース", className: "bg-green-50 text-green-600" };
}

export function useGoalCard(goal: Goal) {
  const { t } = useTranslation("goal");
  const today = getToday();
  const actualEndDate =
    goal.endDate && goal.endDate < today ? goal.endDate : today;

  const totalDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
    return Math.max(end.diff(start, "day") + 1, 1);
  }, [goal.startDate, goal.endDate]);

  const todayLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("[date+activityId]")
        .equals([today, goal.activityId])
        .filter((log) => !log.deletedAt)
        .count(),
    [today, goal.activityId],
  );
  const hasTodayLog = (todayLogs ?? 0) > 0;

  const freezePeriods = useLiveQuery(
    () =>
      db.goalFreezePeriods
        .where("goalId")
        .equals(goal.id)
        .filter((fp) => !fp.deletedAt)
        .toArray(),
    [goal.id],
  );

  const isCurrentlyFrozen = useMemo(() => {
    if (!freezePeriods) return false;
    return freezePeriods.some(
      (fp) =>
        fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
    );
  }, [freezePeriods, today]);

  const periodLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .between(goal.startDate, actualEndDate, true, true)
        .filter((log) => log.activityId === goal.activityId && !log.deletedAt)
        .toArray(),
    [goal.activityId, goal.startDate, actualEndDate],
  );

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
    const pct = (elapsedDays / totalDays) * 100;
    return Math.min(pct, 100);
  }, [elapsedDays, totalDays]);

  // --- やらなかった日付（showInactiveDates設定時） ---
  const showInactiveDatesEnabled = useMemo(() => {
    try {
      const raw = localStorage.getItem("actiko-v2-settings");
      if (!raw) return false;
      const settings = JSON.parse(raw);
      return settings.showInactiveDates === true;
    } catch {
      return false;
    }
  }, []);

  const monthStart = useMemo(() => getStartOfMonth(), []);
  const monthEnd = useMemo(() => getEndOfMonth(), []);
  const effectiveStart = useMemo(
    () => (goal.startDate > monthStart ? goal.startDate : monthStart),
    [goal.startDate, monthStart],
  );
  const effectiveEnd = useMemo(() => {
    const end =
      goal.endDate && goal.endDate < monthEnd ? goal.endDate : monthEnd;
    return end > today ? today : end;
  }, [goal.endDate, monthEnd, today]);

  const monthLogs = useLiveQuery(() => {
    if (!showInactiveDatesEnabled) return [];
    return db.activityLogs
      .where("date")
      .between(effectiveStart, effectiveEnd, true, true)
      .filter((log) => log.activityId === goal.activityId && !log.deletedAt)
      .toArray();
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
