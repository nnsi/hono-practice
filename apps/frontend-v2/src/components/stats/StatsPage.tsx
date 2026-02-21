import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { apiFetch } from "../../utils/apiClient";
import type { ActivityStat, GoalData, GoalLine } from "./types";
import { ActivityStatCard } from "./ActivityStatCard";

export function StatsPage() {
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [stats, setStats] = useState<ActivityStat[] | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).subtract(1, "month").format("YYYY-MM"));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => dayjs(prev).add(1, "month").format("YYYY-MM"));
  }, []);

  // Fetch stats
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const res = await apiFetch(
        `/users/activity-logs/stats?date=${month}`,
      );
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats([]);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

  // Fetch goals (best-effort, non-blocking)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await apiFetch("/users/goals");
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        // API returns { goals: GoalData[] } or GoalData[]
        setGoals(Array.isArray(data) ? data : data.goals ?? []);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getGoalLinesForActivity = useCallback(
    (activityId: string): GoalLine[] => {
      if (!goals.length) return [];

      const monthStart = dayjs(month).startOf("month");
      const monthEnd = dayjs(month).endOf("month");

      const relevant = goals.filter((goal) => {
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
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-medium min-w-[100px] text-center">
            {dayjs(month).format("YYYY年M月")}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} />
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
