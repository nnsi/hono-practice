import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { trackServerTimestamps } from "./serverTime";
import type { SyncResult } from "./syncResult";

/** push 待ちのローカル行。id と updatedAt で送信した版を特定する。 */
export type PendingSyncRecord = SyncRevision & { _syncStatus: string };

/** レスポンスの id を、そのリクエストで送った版（id + updatedAt）へ対応づける。 */
export function revisionsForIds<T extends SyncRevision>(
  sent: readonly T[],
  ids: readonly string[],
): SyncRevision[] {
  const idSet = new Set(ids);
  return sent
    .filter((record) => idSet.has(record.id))
    .map((record) => ({ id: record.id, updatedAt: record.updatedAt }));
}

function serverUpdatedAt(row: Record<string, unknown>): string | null {
  const value = row.updatedAt ?? row.updated_at;
  return typeof value === "string" ? value : null;
}

/**
 * push の応答に含まれるサーバー側の updatedAt を時計へ反映する。
 * ローカル行の状態を更新する前に呼ぶ（付け直す時刻が受理済みの版より後になる）。
 */
export function trackSyncResultTimestamps(result: SyncResult): void {
  trackServerTimestamps([
    ...(result.syncedRevisions ?? []).map((revision) => revision.updatedAt),
    ...result.serverWins.map(serverUpdatedAt),
  ]);
}
