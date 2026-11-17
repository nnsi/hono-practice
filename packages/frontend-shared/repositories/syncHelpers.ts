import type {
  SyncRevision,
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";

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

type Versioned = { id: string; updatedAt: string };

/**
 * push の応答待ち中に編集された行へ、新しい時刻を付け直す。
 *
 * 応答待ち中の編集は、サーバーが受理時に繰り上げた updatedAt より古い時刻を
 * 持っている。そのまま送るとサーバーに「古い更新」として捨てられるため、
 * 受理済みの版より後の時刻にする（呼び出し前に応答の時刻を
 * trackSyncResultTimestamps で反映しておくこと）。
 */
export async function restampRowsEditedDuringSync<T extends Versioned>(
  sentRevisions: SyncRevision[],
  getByIds: (ids: string[]) => Promise<Syncable<T>[]>,
  restamp: (id: string, updatedAt: string) => Promise<void>,
): Promise<void> {
  if (sentRevisions.length === 0) return;
  const sentById = new Map(
    sentRevisions.map((revision) => [revision.id, revision.updatedAt]),
  );
  const localRecords = await getByIds([...sentById.keys()]);
  for (const local of localRecords) {
    const unsent =
      local._syncStatus === "pending" || local._syncStatus === "failed";
    if (!unsent || local.updatedAt === sentById.get(local.id)) continue;
    await restamp(local.id, getServerNowISOString());
  }
}

type SyncAckAdapter<T extends Versioned> = {
  getByIds(ids: string[]): Promise<Syncable<T>[]>;
  update(id: string, changes: { updatedAt: string }): Promise<void>;
  /** 送信した版から変わっていない行だけ状態を更新する */
  updateSyncStatus(
    revisions: SyncRevision[],
    status: SyncStatus,
  ): Promise<void>;
};

/**
 * サーバーが受理した版だけを synced にする。応答待ち中に編集された行は
 * 未送信の編集を持つため synced にせず、次の同期で送る。
 */
export async function markRevisionsSynced<T extends Versioned>(
  adapter: SyncAckAdapter<T>,
  revisions: SyncRevision[],
): Promise<void> {
  if (revisions.length === 0) return;
  await adapter.updateSyncStatus(revisions, "synced");
  await restampRowsEditedDuringSync(
    revisions,
    (ids) => adapter.getByIds(ids),
    (id, updatedAt) => adapter.update(id, { updatedAt }),
  );
}
