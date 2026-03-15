import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiTask } from "../mappers/apiMappers";

type SyncTasksDeps<T extends { _syncStatus: string }> = {
  getPendingSyncTasks: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markTasksSynced: (ids: string[]) => Promise<void>;
  markTasksFailed: (ids: string[]) => Promise<void>;
  upsertTasksFromServer: (
    wins: ReturnType<typeof mapApiTask>[],
  ) => Promise<void>;
};

export function createSyncTasks<T extends { _syncStatus: string }>(
  deps: SyncTasksDeps<T>,
) {
  return async function syncTasks(): Promise<void> {
    const gen = getSyncGeneration();
    const pending = await deps.getPendingSyncTasks();
    if (pending.length === 0) return;

    const tasks = pending.map(({ _syncStatus, ...t }) => t);
    const chunks = chunkArray(tasks);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);

      if (gen !== getSyncGeneration()) return;
      await deps.markTasksSynced(data.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markTasksFailed(data.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertTasksFromServer(data.serverWins.map(mapApiTask));
      }
    }
  };
}
