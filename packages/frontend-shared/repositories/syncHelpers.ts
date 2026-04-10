import type { Syncable } from "@packages/domain/sync/syncableRecord";

/**
 * サーバーからのupsert時に、ローカルのpendingレコードや
 * より新しいレコードを保護するフィルタ。
 * 全リポジトリ共通のロジック。
 */
export function filterSafeUpserts<T extends { id: string; updatedAt: string }>(
  serverRecords: T[],
  localRecords: Syncable<T>[],
): T[] {
  const localMap = new Map(localRecords.map((r) => [r.id, r]));
  return serverRecords.filter((t) => {
    const local = localMap.get(t.id);
    if (!local) return true;
    if (local._syncStatus === "pending") return false;
    if (new Date(local.updatedAt) > new Date(t.updatedAt)) return false;
    return true;
  });
}
