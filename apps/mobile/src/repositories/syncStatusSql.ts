import type {
  SyncRevision,
  SyncStatus,
} from "@packages/domain/sync/syncableRecord";

import { getDatabase } from "../db/database";

type SyncableTable =
  | "activity_logs"
  | "goal_freeze_periods"
  | "goals"
  | "note"
  | "task_schedules"
  | "tasks";

const BATCH_SIZE = 100;

/**
 * 送信した版（id + updated_at）から変わっていない行だけ sync_status を更新する。
 * push の応答待ち中に編集された行は未送信の編集を持つため、状態を変えない。
 */
export async function updateSyncStatusForRevisions(
  table: SyncableTable,
  revisions: SyncRevision[],
  status: SyncStatus,
): Promise<void> {
  if (revisions.length === 0) return;
  const db = await getDatabase();
  for (let i = 0; i < revisions.length; i += BATCH_SIZE) {
    const batch = revisions.slice(i, i + BATCH_SIZE);
    const where = batch.map(() => "(id = ? AND updated_at = ?)").join(" OR ");
    await db.runAsync(`UPDATE ${table} SET sync_status = ? WHERE ${where}`, [
      status,
      ...batch.flatMap((r) => [r.id, r.updatedAt]),
    ]);
  }
}
