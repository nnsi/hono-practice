import type {
  FreezePeriod,
  GoalBalanceResult,
} from "@packages/domain/goal/goalBalance";
import { calculateGoalBalance } from "@packages/domain/goal/goalBalance";

import { getToday } from "../utils/dateUtils";
import type { ReactHooks } from "./types";

// biome-ignore lint: i18next TFunction has complex overloads
type TFunc = (...args: any[]) => string;

/**
 * GoalCard の共通型
 */
export type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
};

export type StatusBadge = {
  label: string;
  bgClass: string;
  textClass: string;
};

export function getStatusBadge(
  goal: GoalForCard,
  hasTodayLog: boolean,
  balance: number,
  t: TFunc,
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

export type GoalCardResult = {
  today: string;
  totalDays: number;
  elapsedDays: number;
  localBalance: number;
  balance: GoalBalanceResult;
  isCurrentlyFrozen: boolean;
  completionPercent: number;
  progressPercent: number;
  showInactiveDatesEnabled: boolean;
  inactiveDates: string[];
  statusBadge: StatusBadge;
  balanceColor: string;
};

type GoalCardDeps = {
  react: Pick<ReactHooks, "useMemo">;
  // biome-ignore lint: i18next useTranslation has complex overloads
  useTranslation: (...args: any[]) => { t: TFunc };
  // biome-ignore lint: dayjs has complex overloads
  dayjs: (...args: any[]) => any;
  /** 今日のログ数を返すフック */
  useTodayLogCount: (activityId: string, today: string) => number | undefined;
  /** 期間内のログを返すフック */
  usePeriodLogs: (
    activityId: string,
    startDate: string,
    endDate: string,
  ) => { date: string; quantity: number | null }[] | undefined;
  /** ゴールの freeze periods を返すフック */
  useFreezePeriods: (goalId: string) => FreezePeriod[] | undefined;
  /** inactive dates を返すフック */
  useInactiveDates: (
    goal: GoalForCard,
    today: string,
  ) => { showInactiveDatesEnabled: boolean; inactiveDates: string[] };
};

export function createUseGoalCard(deps: GoalCardDeps) {
  const {
    react,
    useTranslation,
    dayjs,
    useTodayLogCount,
    usePeriodLogs,
    useFreezePeriods,
    useInactiveDates,
  } = deps;
  const { useMemo } = react;

  return function useGoalCard(goal: GoalForCard): GoalCardResult {
    const { t } = useTranslation("goal");
    const today = getToday();
    const actualEndDate =
      goal.endDate && goal.endDate < today ? goal.endDate : today;

    const totalDays = useMemo(() => {
      const start = dayjs(goal.startDate);
      const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
      return Math.max(end.diff(start, "day") + 1, 1);
    }, [goal.startDate, goal.endDate]);

    const todayLogCount = useTodayLogCount(goal.activityId, today);
    const hasTodayLog = (todayLogCount ?? 0) > 0;

    const freezePeriods = useFreezePeriods(goal.id);

    const isCurrentlyFrozen = useMemo(() => {
      if (!freezePeriods) return false;
      return freezePeriods.some(
        (fp) =>
          fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
      );
    }, [freezePeriods, today]);

    const periodLogs = usePeriodLogs(
      goal.activityId,
      goal.startDate,
      actualEndDate,
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
  };
}
