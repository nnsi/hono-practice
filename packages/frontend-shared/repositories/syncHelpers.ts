import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";

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

/**
 * DB操作を抽象化する汎用アダプタインターフェース。
 * 各リポジトリが拡張して使う。
 */
export type BaseSyncDbAdapter<T extends { id: string }> = {
  getByIds(ids: string[]): Promise<Syncable<T>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(records: Syncable<T>[]): Promise<void>;
};
