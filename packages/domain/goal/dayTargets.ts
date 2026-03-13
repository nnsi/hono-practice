import dayjs from "dayjs";

/** ISO weekday: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun */
export type DayTargets = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>>;

/**
 * 指定日の目標値を返す。
 * dayTargets 未設定なら dailyTargetQuantity をそのまま返す。
 * dayTargets に該当曜日がなければ dailyTargetQuantity をフォールバックとして使う。
 */
export function getDailyTargetForDate(
  dailyTargetQuantity: number,
  dayTargets: DayTargets | null | undefined,
  date: string,
): number {
  if (!dayTargets) return dailyTargetQuantity;
  // dayjs().day(): 0=Sun, 1=Mon, ..., 6=Sat → ISO weekday: 1=Mon, ..., 7=Sun
  const isoWeekday = (dayjs(date).day() || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return dayTargets[isoWeekday] ?? dailyTargetQuantity;
}
