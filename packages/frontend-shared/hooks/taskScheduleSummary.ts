import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import dayjs from "dayjs";

import { ISO_WEEKDAYS } from "./taskCreateRecurrence";

export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

const isIsoWeekday = (day: number): day is IsoWeekday =>
  ISO_WEEKDAYS.some((d) => d === day);

/**
 * 繰り返しの要約に必要な文言。i18n は frontend-shared に持ち込まないので、
 * 呼び出し側（Web / Mobile）が `t()` を束ねて渡す。
 */
export type RecurrenceSummaryLabels = {
  /** intervalDays === 1 */
  daily: string;
  /** intervalDays >= 2 */
  interval: (days: number) => string;
  /** ISO weekday（1=月 … 7=日）の短縮表記 */
  weekday: (day: IsoWeekday) => string;
  /** 曜日の区切り（例: "・" / ", "） */
  weekdaySeparator: string;
};

type RecurrenceSource = Pick<
  TaskScheduleRecord,
  "recurrenceType" | "intervalDays" | "weekdays"
>;

/** 「3日ごと」「月・水・金」のような 1 行要約 */
export function formatRecurrenceSummary(
  schedule: RecurrenceSource,
  labels: RecurrenceSummaryLabels,
): string {
  if (schedule.recurrenceType === "interval") {
    const days = schedule.intervalDays ?? 1;
    return days === 1 ? labels.daily : labels.interval(days);
  }
  return [...(schedule.weekdays ?? [])]
    .filter(isIsoWeekday)
    .sort((a, b) => a - b)
    .map((day) => labels.weekday(day))
    .join(labels.weekdaySeparator);
}

export type ScheduleDateRange = {
  start: string;
  /** endDate が無いときは null（呼び出し側で「終了日なし」等を出す） */
  end: string | null;
};

/** 開始日〜終了日の表示用文字列（YYYY/MM/DD） */
export function formatScheduleDateRange(
  schedule: Pick<TaskScheduleRecord, "startDate" | "endDate">,
): ScheduleDateRange {
  return {
    start: dayjs(schedule.startDate).format("YYYY/MM/DD"),
    end: schedule.endDate ? dayjs(schedule.endDate).format("YYYY/MM/DD") : null,
  };
}

/** 一覧の並び: 稼働中を先に、同じ区分内は開始日の新しい順 → タイトル順 */
export function sortTaskSchedules<
  T extends Pick<TaskScheduleRecord, "isActive" | "startDate" | "title">,
>(schedules: readonly T[]): T[] {
  return [...schedules].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const byStart = b.startDate.localeCompare(a.startDate);
    return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
  });
}
