export type ActivityStat = {
  id: string;
  name: string;
  total: number | null;
  quantityUnit: string;
  showCombinedStats: boolean;
  kinds: StatsKind[];
};

export type StatsKind = {
  id: string | null;
  name: string;
  color: string | null;
  total: number;
  logs: StatsKindLog[];
};

export type StatsKindLog = {
  date: string;
  quantity: number;
};

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
