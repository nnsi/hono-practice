import dayjs from "dayjs";

/** デバイスローカルの「今日」をYYYY-MM-DD形式で返す */
export const getToday = (): string => dayjs().format("YYYY-MM-DD");

/** 指定日が今日かどうか判定 */
export const isToday = (date: string): boolean => date === getToday();

/** 月の初日 YYYY-MM-DD（dateを省略すると今月） */
export const getStartOfMonth = (date?: string): string =>
  dayjs(date).startOf("month").format("YYYY-MM-DD");

/** 月の末日 YYYY-MM-DD（dateを省略すると今月） */
export const getEndOfMonth = (date?: string): string =>
  dayjs(date).endOf("month").format("YYYY-MM-DD");

/** N日前/後の日付 */
export const addDays = (date: string, days: number): string =>
  dayjs(date).add(days, "day").format("YYYY-MM-DD");

/** N月前/後の月 YYYY-MM */
export const addMonths = (month: string, n: number): string =>
  dayjs(`${month}-01`).add(n, "month").format("YYYY-MM");

/** 月の日数 */
export const daysInMonth = (date: string): number => dayjs(date).daysInMonth();
