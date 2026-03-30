/**
 * バックエンド用日付ユーティリティ。
 * Client-sends-date 方針: バックエンドは原則クライアントから YYYY-MM-DD を受け取る。
 * 自分で「今日」を導出しない。
 */

/** Date型を YYYY-MM-DD 文字列に変換（UTC基準） */
export function formatDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 日付文字列から月末日を取得 (YYYY-MM or YYYY-MM-DD) */
export function getEndOfMonth(monthStr: string): string {
  const [y, mStr] = monthStr.split("-");
  const m = Number(mStr);
  // 翌月の0日 = 当月の最終日
  const lastDay = new Date(Date.UTC(Number(y), m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** 2つの日付文字列間の全日付を生成（fromとtoを含む） */
export function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (current <= end) {
    dates.push(formatDateString(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
