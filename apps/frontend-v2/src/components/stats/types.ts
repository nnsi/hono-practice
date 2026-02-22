import type { GetActivityStatsResponse } from "../../../../../packages/types/response/GetActivityStatsResponse";

export type ActivityStat = GetActivityStatsResponse[number];
export type StatsKind = ActivityStat["kinds"][number];
export type StatsKindLog = StatsKind["logs"][number];

export type GoalLine = {
  id: string;
  value: number;
  label: string;
  color: string;
};

export type ChartData = {
  date: string;
  [key: string]: string | number;
};
