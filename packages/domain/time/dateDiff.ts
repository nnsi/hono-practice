/**
 * "YYYY-MM-DD" を UTC ミリ秒に変換する（時刻成分は常に 00:00 UTC）。
 * UTC には DST が無いため、暦日ベースの差分計算の基準として安全。
 */
function parseYMDToUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * カレンダー日ベースの日数差（end - start）を返す。
 *
 * `dayjs(a).diff(b, "day")` は経過ミリ秒 ÷ 86,400,000 の切り捨てのため、
 * DST を跨ぐ期間（例: America/New_York の spring-forward）で 1 日過少になる。
 * 本関数は両端を UTC 深夜に正規化してから差を取るので、タイムゾーン・DST に
 * 依存せず常に整数の暦日差を返す。
 *
 * @param start "YYYY-MM-DD"
 * @param end   "YYYY-MM-DD"
 * @returns 暦日差（end >= start なら 0 以上、end < start なら負）
 */
export function calendarDayDiff(start: string, end: string): number {
  const s = parseYMDToUTC(start);
  const e = parseYMDToUTC(end);
  return Math.round((e - s) / 86_400_000);
}
