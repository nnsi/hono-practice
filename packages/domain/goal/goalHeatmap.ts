import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import { generateDailyRecords } from "./goalStats";

dayjs.extend(isSameOrBefore);

type HeatmapGoalInput = {
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  activityId: string;
};

type LogEntry = { date: string; quantity: number | null };

export type HeatmapCell = {
  date: string;
  achievedCount: number;
  activeCount: number;
  totalGoals: number;
};

/**
 * 全ゴールの日次達成状況をカレンダー用に集約する。
 * 各日付について「アクティブなゴール数」と「達成したゴール数」を返す。
 */
export function generateHeatmapData(
  goals: HeatmapGoalInput[],
  logsByActivityId: Map<string, LogEntry[]>,
  dateRange: { start: string; end: string },
  today: string,
): HeatmapCell[] {
  // 各ゴールの日次レコードをMap<date, {achieved, hasActivity}>にする
  const goalRecordMaps: Array<{
    recordMap: Map<string, { achieved: boolean; hasActivity: boolean }>;
    startDate: string;
    endDate: string | null;
  }> = [];

  for (const goal of goals) {
    const logs = logsByActivityId.get(goal.activityId) ?? [];
    const dailyRecords = generateDailyRecords(goal, logs, today);
    const recordMap = new Map<
      string,
      { achieved: boolean; hasActivity: boolean }
    >();
    for (const record of dailyRecords) {
      recordMap.set(record.date, {
        achieved: record.achieved,
        hasActivity: record.quantity > 0,
      });
    }
    goalRecordMaps.push({
      recordMap,
      startDate: goal.startDate,
      endDate: goal.endDate,
    });
  }

  // dateRange 内の各日付を走査
  const cells: HeatmapCell[] = [];
  let current = dayjs(dateRange.start);
  const end = dayjs(dateRange.end);

  while (current.isSameOrBefore(end)) {
    const dateStr = current.format("YYYY-MM-DD");
    let achievedCount = 0;
    let activeCount = 0;
    let totalGoals = 0;

    for (const { recordMap, startDate, endDate } of goalRecordMaps) {
      const isActive =
        dateStr >= startDate && (endDate === null || dateStr <= endDate);
      if (!isActive) continue;

      // 未来の日付はスキップ（generateDailyRecordsはtodayまでしか生成しない）
      if (dateStr > today) continue;

      totalGoals++;
      const record = recordMap.get(dateStr);
      if (record?.achieved) {
        achievedCount++;
      }
      if (record?.hasActivity) {
        activeCount++;
      }
    }

    cells.push({ date: dateStr, achievedCount, activeCount, totalGoals });
    current = current.add(1, "day");
  }

  return cells;
}
