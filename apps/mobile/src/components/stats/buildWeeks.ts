import type {
  ChartData,
  StatsKind,
} from "@packages/frontend-shared/types/stats";
import { roundQuantity } from "@packages/frontend-shared/utils/statsFormatting";
import dayjs from "dayjs";

export type WeekDay = {
  date: string;
  dayOfWeek: string;
  total: number;
  breakdown: Record<string, number>;
};

export type WeekEntry = {
  weekStart: dayjs.Dayjs;
  days: WeekDay[];
  weekTotal: number;
};

export function buildWeeks(
  data: ChartData[],
  kinds: StatsKind[],
  month: string,
): WeekEntry[] {
  const weekMap: Record<string, WeekEntry> = {};

  for (const day of data) {
    const dayNumber = Number.parseInt(
      (day.date as string).replace("日", ""),
      10,
    );
    const dateObj = dayjs(month).date(dayNumber);
    const weekKey = dateObj.startOf("week").format("YYYY-MM-DD");

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = {
        weekStart: dateObj.startOf("week"),
        days: [],
        weekTotal: 0,
      };
    }

    const dayTotal = kinds.reduce((sum, kind) => {
      return sum + (Number(day[kind.name]) || 0);
    }, 0);
    const roundedTotal = roundQuantity(dayTotal);

    const breakdown: Record<string, number> = {};
    for (const kind of kinds) {
      breakdown[kind.name] = Number(day[kind.name]) || 0;
    }

    weekMap[weekKey].days.push({
      date: dateObj.format("MM/DD"),
      dayOfWeek: dateObj.format("ddd"),
      total: roundedTotal,
      breakdown,
    });

    weekMap[weekKey].weekTotal += roundedTotal;
  }

  return Object.values(weekMap).sort(
    (a, b) => a.weekStart.valueOf() - b.weekStart.valueOf(),
  );
}
