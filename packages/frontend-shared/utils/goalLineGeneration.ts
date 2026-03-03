import type { GoalLine } from "../types/stats";

type GoalInput = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type DayjsLike = {
  startOf(unit: string): DayjsLike;
  endOf(unit: string): DayjsLike;
  isBefore(other: any): boolean;
  isAfter(other: any): boolean;
};

type DayjsFn = (date: string) => DayjsLike;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 指定アクティビティに関連するゴールラインを生成する純粋関数。
 * dayjs を DI で受け取ることで、パッケージ側の dayjs 依存を避ける。
 */
export function generateGoalLines(params: {
  activityId: string;
  goals: GoalInput[];
  month: string;
  quantityUnit: string;
  dayjs: DayjsFn;
}): GoalLine[] {
  const { activityId, goals, month, quantityUnit, dayjs } = params;

  if (goals.length === 0) return [];

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
    label: `目標${relevant.length > 1 ? i + 1 : ""}: ${goal.dailyTargetQuantity}${quantityUnit}`,
    color: "#ff6b6b",
  }));
}
