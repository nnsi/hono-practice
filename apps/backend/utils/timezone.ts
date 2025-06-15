// 将来的にユーザーごとのタイムゾーン対応を行う際の拡張ポイント
// 現在はJST固定だが、将来的にはuserテーブルのtimezoneカラムから取得する

export const DEFAULT_TIMEZONE = "Asia/Tokyo";
export const JST_OFFSET_HOURS = 9;

/**
 * 指定された日付をタイムゾーンの開始時刻（00:00）に変換
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @param timezone タイムゾーン（デフォルト: Asia/Tokyo）
 */
export function getStartOfDayInTimezone(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  // 現在はJST固定実装
  if (timezone !== DEFAULT_TIMEZONE) {
    throw new Error(`Timezone ${timezone} is not supported yet`);
  }
  
  // JST 00:00:00 を作成
  return new Date(`${dateStr}T00:00:00+09:00`);
}

/**
 * 指定された日付をタイムゾーンの終了時刻（23:59:59.999）に変換
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @param timezone タイムゾーン（デフォルト: Asia/Tokyo）
 */
export function getEndOfDayInTimezone(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  // 現在はJST固定実装
  if (timezone !== DEFAULT_TIMEZONE) {
    throw new Error(`Timezone ${timezone} is not supported yet`);
  }
  
  // JST 23:59:59.999 を作成
  return new Date(`${dateStr}T23:59:59.999+09:00`);
}

/**
 * 現在時刻から指定タイムゾーンでの日付文字列を取得
 * @param timezone タイムゾーン（デフォルト: Asia/Tokyo）
 */
export function getCurrentDateInTimezone(
  timezone: string = DEFAULT_TIMEZONE,
): string {
  // 現在はJST固定実装
  if (timezone !== DEFAULT_TIMEZONE) {
    throw new Error(`Timezone ${timezone} is not supported yet`);
  }
  
  const now = new Date();
  const jstOffset = JST_OFFSET_HOURS * 60 * 60 * 1000;
  const jstTime = new Date(now.getTime() + jstOffset);
  
  // UTC時刻として扱い、YYYY-MM-DD形式で返す
  return jstTime.toISOString().split("T")[0];
}

/**
 * 2つの日付間の経過日数を計算（タイムゾーン考慮）
 * @param startDateStr 開始日（YYYY-MM-DD形式）
 * @param endDateStr 終了日（YYYY-MM-DD形式）
 * @param timezone タイムゾーン（デフォルト: Asia/Tokyo）
 * @returns 経過日数（開始日を1日目として計算）
 */
export function getDaysBetweenInTimezone(
  startDateStr: string,
  endDateStr: string,
  timezone: string = DEFAULT_TIMEZONE,
): number {
  const startDate = getStartOfDayInTimezone(startDateStr, timezone);
  const endDate = getStartOfDayInTimezone(endDateStr, timezone);
  
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  // 開始日を1日目として数えるため +1
  return diffInDays + 1;
}

/**
 * Date型から指定タイムゾーンでの日付文字列を取得
 * @param date Date型の日時
 * @param timezone タイムゾーン（デフォルト: Asia/Tokyo）
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  // 現在はJST固定実装
  if (timezone !== DEFAULT_TIMEZONE) {
    throw new Error(`Timezone ${timezone} is not supported yet`);
  }
  
  // JSTでの日付を取得
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  
  const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  
  return `${year}-${month}-${day}`;
}