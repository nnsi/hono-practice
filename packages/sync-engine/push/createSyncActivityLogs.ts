import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiActivityLog } from "../mappers/apiMappers";

type SyncActivityLogsDeps<T extends { _syncStatus: string }> = {
  getPendingSyncActivityLogs: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markActivityLogsSynced: (ids: string[]) => Promise<void>;
  markActivityLogsFailed: (ids: string[]) => Promise<void>;
  upsertActivityLogsFromServer: (
    wins: ReturnType<typeof mapApiActivityLog>[],
  ) => Promise<void>;
};

export function createSyncActivityLogs<T extends { _syncStatus: string }>(
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

      if (gen !== getSyncGeneration()) return;
      await deps.markActivityLogsSynced(data.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markActivityLogsFailed(data.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertActivityLogsFromServer(
          data.serverWins.map(mapApiActivityLog),
        );
      }
    }
  };
}
