import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import type { DayTargets } from "./dayTargets";
import { getDailyTargetForDate } from "./dayTargets";

dayjs.extend(isSameOrBefore);

type GoalBalanceInput = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  dayTargets?: DayTargets | null;
};

type LogEntry = { date: string; quantity: number | null };

export type DailyRecord = { date: string; quantity: number; achieved: boolean };

export function generateDailyRecords(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): DailyRecord[] {
  const endDate = goal.endDate || today;
  const actualEndDate = endDate < today ? endDate : today;

  // Build date->quantity map
  const dateMap = new Map<string, number>();
  for (const log of logs) {
    if (log.date >= goal.startDate && log.date <= actualEndDate) {
      const qty = log.quantity ?? 0;
      dateMap.set(log.date, (dateMap.get(log.date) ?? 0) + qty);
    }
  }

  const dailyRecords: DailyRecord[] = [];
  let current = dayjs(goal.startDate);
  const end = dayjs(actualEndDate);
  while (current.isSameOrBefore(end)) {
    const dateStr = current.format("YYYY-MM-DD");
    const quantity = dateMap.get(dateStr) ?? 0;
    const target = getDailyTargetForDate(
      goal.dailyTargetQuantity,
      goal.dayTargets,
      dateStr,
    );
    // target=0 は休日 → 義務なしで常に達成扱い
    dailyRecords.push({
      date: dateStr,
      quantity,
      achieved: target > 0 ? quantity >= target : true,
    });
    current = current.add(1, "day");
  }

  return dailyRecords;
}

export function calculateGoalStats(dailyRecords: DailyRecord[]): {
  average: number;
  max: number;
  maxConsecutiveDays: number;
  achievedDays: number;
  activeDays: number;
} {
  const activeQuantities = dailyRecords
    .filter((r) => r.quantity > 0)
    .map((r) => r.quantity);
  const total = activeQuantities.reduce((sum, q) => sum + q, 0);
  const average =
    activeQuantities.length > 0
      ? Math.round((total / activeQuantities.length) * 10) / 10
      : 0;
  const max =
    activeQuantities.length > 0
      ? Math.round(Math.max(...activeQuantities) * 10) / 10
      : 0;
  const achievedDays = dailyRecords.filter((r) => r.achieved).length;
  const activeDays = activeQuantities.length;

  // Max consecutive days
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let lastDate: dayjs.Dayjs | null = null;
  for (const record of dailyRecords) {
    if (record.quantity > 0) {
      const d = dayjs(record.date);
      if (lastDate === null || d.diff(lastDate, "day") === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
      lastDate = d;
    } else {
      currentConsecutive = 0;
      lastDate = null;
    }
  }

  return {
    average,
    max,
    maxConsecutiveDays: maxConsecutive,
    achievedDays,
    activeDays,
  };
}

export function getInactiveDates(
  goal: GoalBalanceInput,
  logs: LogEntry[],
  today: string,
): string[] {
  const endDate = goal.endDate && goal.endDate < today ? goal.endDate : today;

  // Build set of active dates
  const activeDates = new Set<string>();
  for (const log of logs) {
    if (
      log.date >= goal.startDate &&
      log.date <= endDate &&
      (log.quantity ?? 0) > 0
    ) {
      activeDates.add(log.date);
    }
  }

  // Iterate through all dates using dayjs (no new Date())
  const inactiveDates: string[] = [];
  let current = dayjs(goal.startDate);
  const end = dayjs(endDate);
  while (current.isSameOrBefore(end)) {
    const dateStr = current.format("YYYY-MM-DD");
    // dayTargets で target=0 の日は休日 → 非活動日にカウントしない
    const target = getDailyTargetForDate(
      goal.dailyTargetQuantity,
      goal.dayTargets,
      dateStr,
    );
    if (target > 0 && !activeDates.has(dateStr)) {
      inactiveDates.push(dateStr);
    }
    current = current.add(1, "day");
  }

  return inactiveDates;
}
