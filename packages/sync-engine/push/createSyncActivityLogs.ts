import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { chunkArray } from "../core/chunkedSync";
import {
  type PendingSyncRecord,
  revisionsForIds,
  trackSyncResultTimestamps,
} from "../core/pushResult";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiActivityLog } from "../mappers/apiMappers";

type SyncActivityLogsDeps<T extends PendingSyncRecord> = {
  getPendingSyncActivityLogs: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markActivityLogsSynced: (revisions: SyncRevision[]) => Promise<void>;
  markActivityLogsFailed: (revisions: SyncRevision[]) => Promise<void>;
  upsertActivityLogsFromServer: (
    wins: ReturnType<typeof mapApiActivityLog>[],
  ) => Promise<void>;
};

export function createSyncActivityLogs<T extends PendingSyncRecord>(
  deps: SyncActivityLogsDeps<T>,
) {
  return async function syncActivityLogs(): Promise<void> {
    const gen = getSyncGeneration();

    const pending = await deps.getPendingSyncActivityLogs();
    if (pending.length === 0) return;

    const logs = pending.map(({ _syncStatus, ...log }) => log);
    const chunks = chunkArray(logs);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);
      trackSyncResultTimestamps(data);

      if (gen !== getSyncGeneration()) return;
      await deps.markActivityLogsSynced(
        revisionsForIds(pending, data.syncedIds),
      );
      if (gen !== getSyncGeneration()) return;
      await deps.markActivityLogsFailed(
        revisionsForIds(pending, data.skippedIds),
      );
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertActivityLogsFromServer(
          data.serverWins.map(mapApiActivityLog),
        );
      }
    }
  };
}
