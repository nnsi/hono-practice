import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import type { ActivityStat, GoalLine } from "./types";

export function useStatsPage() {
  // --- state ---
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));

  // --- data ---
  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).subtract(1, "month").format("YYYY-MM"));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).add(1, "month").format("YYYY-MM"));
  }, []);

  // --- computed ---
  const startDate = useMemo(
    () => dayjs(`${month}-01`).format("YYYY-MM-DD"),
    [month],
  );
  const endDate = useMemo(
    () => dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD"),
    [month],
  );

  const activities = useLiveQuery(() =>
    db.activities
      .orderBy("orderIndex")
      .filter((a) => !a.deletedAt)
      .toArray(),
  );

  const allKinds = useLiveQuery(() =>
    db.activityKinds.filter((k) => !k.deletedAt).toArray(),
  );

  const monthLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .between(startDate, endDate, true, true)
        .filter((log) => log.deletedAt === null)
        .toArray(),
    [startDate, endDate],
  );

  const goals = useLiveQuery(() =>
    db.goals.filter((g) => !g.deletedAt).toArray(),
  );

  const isLoading = !activities || !allKinds || !monthLogs;

  const stats: ActivityStat[] | null = useMemo(() => {
    if (!activities || !allKinds || !monthLogs) return null;

    // ログをアクティビティIDでグループ化
    const logsByActivity = new Map<
      string,
      (typeof monthLogs)[number][]
    >();
    for (const log of monthLogs) {
      const list = logsByActivity.get(log.activityId) ?? [];
      list.push(log);
      logsByActivity.set(log.activityId, list);
    }

    return activities
      .filter((a) => logsByActivity.has(a.id))
      .map((activity) => {
        const actLogs = logsByActivity.get(activity.id) ?? [];
        const actKinds = allKinds
          .filter((k) => k.activityId === activity.id)
          .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

        const validKindIds = new Set(actKinds.map((k) => k.id));

        // ログをkindごとにグループ化
        const logsByKind = new Map<
          string | null,
          (typeof monthLogs)[number][]
        >();
        for (const log of actLogs) {
          // kindIdが有効でなければ「未指定」扱い
          const key =
            log.activityKindId && validKindIds.has(log.activityKindId)
              ? log.activityKindId
              : null;
          const list = logsByKind.get(key) ?? [];
          list.push(log);
          logsByKind.set(key, list);
        }

        // kinds配列を構築
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

        // 未指定ログ（kindIdがnullまたは無効なログ）
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

  // --- handlers ---
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

  // --- return ---
  return {
    // date
    month,
    goToPrevMonth,
    goToNextMonth,
    // data
    isLoading,
    stats,
    allDates,
    // handlers
    getGoalLinesForActivity,
  };
}
