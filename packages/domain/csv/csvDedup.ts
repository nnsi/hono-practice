/**
 * CSVインポート時の重複チェック用ユーティリティ。
 * (date, activityId, quantity, memo) の完全一致で既存レコードとの重複を判定する。
 */

type DedupFields = {
  date: string;
  activityId: string;
  quantity: number | null;
  memo: string;
};

export function buildDedupKey(fields: DedupFields): string {
  return `${fields.date}|${fields.activityId}|${fields.quantity ?? ""}|${fields.memo}`;
}

export function buildDedupSet(
  existingLogs: ReadonlyArray<DedupFields>,
): Set<string> {
  const set = new Set<string>();
  for (const log of existingLogs) {
    set.add(buildDedupKey(log));
  }
  return set;
}
