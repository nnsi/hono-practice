import type {
  SyncRevision,
  SyncStatus,
} from "@packages/domain/sync/syncableRecord";
import type { Table } from "dexie";

type SyncableRow = {
  id: string;
  updatedAt: string;
  _syncStatus: SyncStatus;
};

/**
 * 送信した版（id + updatedAt）から変わっていない行だけ _syncStatus を更新する。
 * push の応答待ち中に編集された行は未送信の編集を持つため、状態を変えない。
 */
export async function updateSyncStatusForRevisions<T extends SyncableRow>(
  table: Table<T, string>,
  revisions: SyncRevision[],
  status: SyncStatus,
): Promise<void> {
  if (revisions.length === 0) return;
  const expectedById = new Map(
    revisions.map((revision) => [revision.id, revision.updatedAt]),
  );
  await table
    .where("id")
    .anyOf([...expectedById.keys()])
    .modify((record) => {
      if (expectedById.get(record.id) === record.updatedAt) {
        record._syncStatus = status;
      }
    });
}
