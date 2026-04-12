import { useMemo } from "react";

import { getInactiveDates } from "@packages/domain/goal/goalStats";
import {
  type GoalForCard,
  createUseGoalCard,
} from "@packages/frontend-shared/hooks/useGoalCard";
import {
  getEndOfMonth,
  getStartOfMonth,
} from "@packages/frontend-shared/utils/dateUtils";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";

function useInactiveDates(goal: GoalForCard, today: string) {
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

  return { showInactiveDatesEnabled, inactiveDates };
}

function useTodayLogCount(activityId: string, today: string) {
  return useLiveQuery(
    () =>
      db.activityLogs
        .where("[date+activityId]")
        .equals([today, activityId])
        .filter((log) => !log.deletedAt)
        .count(),
    [today, activityId],
  );
}

function usePeriodLogs(activityId: string, startDate: string, endDate: string) {
  return useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .between(startDate, endDate, true, true)
        .filter((log) => log.activityId === activityId && !log.deletedAt)
        .toArray(),
    [activityId, startDate, endDate],
  );
}

function useFreezePeriods(goalId: string) {
  return useLiveQuery(
    () =>
      db.goalFreezePeriods
        .where("goalId")
        .equals(goalId)
        .filter((fp) => !fp.deletedAt)
        .toArray(),
    [goalId],
  );
}

export const useGoalCard = createUseGoalCard({
  react: { useMemo },
  useTranslation,
  dayjs,
  useTodayLogCount,
  usePeriodLogs,
  useFreezePeriods,
  useInactiveDates,
});
