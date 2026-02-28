import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "../../db/useLiveQuery";
import { getDatabase } from "../../db/database";
import { activityRepository } from "../../repositories/activityRepository";
import { goalRepository } from "../../repositories/goalRepository";
import type { ActivityStat, GoalLine } from "./types";

type LogRow = {
  id: string;
  activity_id: string;
  activity_kind_id: string | null;
  quantity: number | null;
  date: string;
  deleted_at: string | null;
};

export function useStatsPage() {
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));

  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).subtract(1, "month").format("YYYY-MM"));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).add(1, "month").format("YYYY-MM"));
  }, []);

  const startDate = useMemo(
    () => dayjs(`${month}-01`).format("YYYY-MM-DD"),
    [month],
  );
  const endDate = useMemo(
    () => dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD"),
    [month],
  );

  const activities = useLiveQuery("activities", () =>
    activityRepository.getAllActivities(),
  );

  const allKinds = useLiveQuery("activity_kinds", () =>
    activityRepository.getAllActivityKinds(),
  );

  const monthLogs = useLiveQuery(
    "activity_logs",
    async () => {
      const db = await getDatabase();
      return db.getAllAsync<LogRow>(
        "SELECT * FROM activity_logs WHERE date >= ? AND date <= ? AND deleted_at IS NULL",
        [startDate, endDate],
      );
    },
    [startDate, endDate],
  );

  const goals = useLiveQuery("goals", () => goalRepository.getAllGoals());

  const isLoading = !activities || !allKinds || !monthLogs;

  const stats: ActivityStat[] | null = useMemo(() => {
    if (!activities || !allKinds || !monthLogs) return null;

    const logsByActivity = new Map<string, LogRow[]>();
    for (const log of monthLogs) {
      const list = logsByActivity.get(log.activity_id) ?? [];
      list.push(log);
      logsByActivity.set(log.activity_id, list);
    }

    return activities
      .filter((a) => logsByActivity.has(a.id))
      .map((activity) => {
        const actLogs = logsByActivity.get(activity.id) ?? [];
        const actKinds = allKinds
          .filter((k) => k.activityId === activity.id)
          .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

        const validKindIds = new Set(actKinds.map((k) => k.id));

        const logsByKind = new Map<string | null, LogRow[]>();
        for (const log of actLogs) {
          const key =
            log.activity_kind_id && validKindIds.has(log.activity_kind_id)
              ? log.activity_kind_id
              : null;
          const list = logsByKind.get(key) ?? [];
          list.push(log);
          logsByKind.set(key, list);
        }

        const kinds: ActivityStat["kinds"] = [];

        for (const kind of actKinds) {
          const kindLogs = logsByKind.get(kind.id) ?? [];
          const total = kindLogs.reduce(
            (sum, l) => sum + (l.quantity ?? 0),
            0,
          );
          kinds.push({
            id: kind.id,
            name: kind.name,
            color: kind.color,
            total: Math.round(total * 100) / 100,
            logs: kindLogs.map((l) => ({
              date: l.date,
              quantity: l.quantity ?? 0,
            })),
          });
        }

        const unspecifiedLogs = logsByKind.get(null) ?? [];
        if (unspecifiedLogs.length > 0 || actKinds.length === 0) {
          const total = unspecifiedLogs.reduce(
            (sum, l) => sum + (l.quantity ?? 0),
            0,
          );
          kinds.push({
            id: null,
            name: "未指定",
            color: null,
            total: Math.round(total * 100) / 100,
            logs: unspecifiedLogs.map((l) => ({
              date: l.date,
              quantity: l.quantity ?? 0,
            })),
          });
        }

        const overallTotal = kinds.reduce((sum, k) => sum + k.total, 0);

        return {
          id: activity.id,
          name: activity.name,
          total: activity.showCombinedStats
            ? Math.round(overallTotal * 100) / 100
            : null,
          quantityUnit: activity.quantityUnit,
          showCombinedStats: activity.showCombinedStats,
          kinds,
        };
      });
  }, [activities, allKinds, monthLogs]);

  const getGoalLinesForActivity = useCallback(
    (activityId: string): GoalLine[] => {
      if (!goals?.length) return [];

      const monthStart = dayjs(month).startOf("month");
      const monthEnd = dayjs(month).endOf("month");

      const relevant = (goals ?? []).filter((goal) => {
        if (goal.activityId !== activityId) return false;
        const goalStart = dayjs(goal.startDate);
        const goalEnd = goal.endDate ? dayjs(goal.endDate) : null;
        if (goalEnd?.isBefore(monthStart)) return false;
        if (goalStart.isAfter(monthEnd)) return false;
        return true;
      });

      return relevant.map((goal, i) => ({
        id: goal.id,
        value: goal.dailyTargetQuantity,
        label: `目標${relevant.length > 1 ? i + 1 : ""}: ${goal.dailyTargetQuantity}`,
        color: "#ff6b6b",
      }));
    },
    [goals, month],
  );

  const allDates = useMemo(() => {
    const start = dayjs(`${month}-01`);
    const days = start.daysInMonth();
    return Array.from({ length: days }, (_, i) =>
      start.add(i, "day").format("YYYY-MM-DD"),
    );
  }, [month]);

  return {
    month,
    goToPrevMonth,
    goToNextMonth,
    isLoading,
    stats,
    allDates,
    getGoalLinesForActivity,
  };
}
