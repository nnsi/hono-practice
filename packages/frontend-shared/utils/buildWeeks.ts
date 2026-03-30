import type {
  ChartData,
  StatsKind,
} from "@packages/frontend-shared/types/stats";
import dayjs from "dayjs";

import { roundQuantity } from "./statsFormatting";

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

/**
 * Group daily ChartData entries into week buckets.
 * @param dateLabel - the suffix stripped from `day.date` to extract day number (e.g. "日" or "日")
 */
export function buildWeeks(
  data: ChartData[],
  kinds: StatsKind[],
  month: string,
  dateLabel = "日",
): WeekEntry[] {
  const weekMap: Record<string, WeekEntry> = {};

  for (const day of data) {
    const dayNumber = Number.parseInt(day.date.replace(dateLabel, ""), 10);
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
      return sum + (day.values[kind.name] || 0);
    }, 0);
    const roundedTotal = roundQuantity(dayTotal);

    const breakdown: Record<string, number> = {};
    for (const kind of kinds) {
      breakdown[kind.name] = day.values[kind.name] || 0;
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
