import type { ActivityStat, GoalLine } from "../types/stats";
import {
  addDays,
  addMonths,
  daysInMonth,
  getEndOfMonth,
  getStartOfMonth,
  getToday,
} from "../utils/dateUtils";
import { generateGoalLines } from "../utils/goalLineGeneration";
import { computeActivityStats } from "./computeActivityStats";
import type { ReactHooks } from "./types";

type ActivityBase = {
  id: string;
  name: string;
  quantityUnit: string;
  showCombinedStats: boolean;
};

type KindBase = {
  id: string;
  activityId: string;
  name: string;
  color: string | null;
  orderIndex: string;
};

type LogBase = {
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  date: string;
};

type GoalBase = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
};

// biome-ignore lint/suspicious/noExplicitAny: dayjs type compatibility across packages
type DayjsFn = (...args: any[]) => any;

export type UseStatsPageDeps<
  TActivity extends ActivityBase,
  TKind extends KindBase,
  TLog extends LogBase,
  TGoal extends GoalBase,
> = {
  react: Pick<ReactHooks, "useState" | "useMemo" | "useCallback">;
  useActivities: () => TActivity[] | undefined;
  useAllKinds: () => TKind[] | undefined;
  useMonthLogs: (startDate: string, endDate: string) => TLog[] | undefined;
  useGoals: () => TGoal[] | undefined;
  dayjs: DayjsFn;
};

export function createUseStatsPage<
  TActivity extends ActivityBase,
  TKind extends KindBase,
  TLog extends LogBase,
  TGoal extends GoalBase,
>(deps: UseStatsPageDeps<TActivity, TKind, TLog, TGoal>) {
  const {
    react: { useState, useMemo, useCallback },
    useActivities,
    useAllKinds,
    useMonthLogs,
    useGoals,
    dayjs,
  } = deps;

  return function useStatsPage() {
    const [month, setMonth] = useState(() => getToday().slice(0, 7));

    const goToPrevMonth = useCallback(() => {
      setMonth((prev) => addMonths(prev, -1));
    }, []);

    const goToNextMonth = useCallback(() => {
      setMonth((prev) => addMonths(prev, 1));
    }, []);

    const startDate = useMemo(() => getStartOfMonth(`${month}-01`), [month]);
    const endDate = useMemo(() => getEndOfMonth(`${month}-01`), [month]);

    const activities = useActivities();
    const allKinds = useAllKinds();
    const monthLogs = useMonthLogs(startDate, endDate);
    const goals = useGoals();

    const isLoading = !activities || !allKinds || !monthLogs;

    const stats: ActivityStat[] | null = useMemo(() => {
      if (!activities || !allKinds || !monthLogs) return null;
      return computeActivityStats(activities, allKinds, monthLogs);
    }, [activities, allKinds, monthLogs]);

    const getGoalLinesForActivity = useCallback(
      (activityId: string): GoalLine[] => {
        if (!goals?.length) return [];
        const unit =
          activities?.find((a) => a.id === activityId)?.quantityUnit ?? "";
        return generateGoalLines({
          activityId,
          goals,
          month,
          quantityUnit: unit,
          dayjs,
        });
      },
      [goals, month, activities],
    );

    const allDates = useMemo(() => {
      const firstDay = `${month}-01`;
      const days = daysInMonth(firstDay);
      return Array.from({ length: days }, (_, i) => addDays(firstDay, i));
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
  };
}
