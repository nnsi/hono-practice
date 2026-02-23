import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { db } from "../../db/schema";
import type { ActivityStat, GoalLine } from "./types";
import { ActivityStatCard } from "./ActivityStatCard";

export function StatsPage() {
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

  // ローカルDBからデータ取得（オフライン対応）
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

  // ローカルデータから統計を算出
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

  return (
    <div className="bg-white min-h-full">
      {/* Month navigation header */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-center gap-3 px-4 pr-14 py-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-base font-medium min-w-[100px] text-center">
            {dayjs(month).format("YYYY年M月")}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-gray-400 py-16">
            <div className="animate-pulse">読み込み中...</div>
          </div>
        ) : !stats || stats.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">データがありません</p>
            <p className="text-sm">
              {dayjs(month).format("YYYY年M月")}
              のアクティビティ記録はありません
            </p>
          </div>
        ) : (
          stats.map((stat) => (
            <ActivityStatCard
              key={stat.id}
              stat={stat}
              allDates={allDates}
              month={month}
              goalLines={getGoalLinesForActivity(stat.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
