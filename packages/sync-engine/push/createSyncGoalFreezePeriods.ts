import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiGoalFreezePeriod } from "../mappers/apiMappers";

type SyncGoalFreezePeriodsDeps<T extends { _syncStatus: string }> = {
  getPendingSyncFreezePeriods: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markFreezePeriodsSynced: (ids: string[]) => Promise<void>;
  markFreezePeriodsFailed: (ids: string[]) => Promise<void>;
  upsertFreezePeriodsFromServer: (
    wins: ReturnType<typeof mapApiGoalFreezePeriod>[],
  ) => Promise<void>;
};

export function createSyncGoalFreezePeriods<T extends { _syncStatus: string }>(
  deps: SyncGoalFreezePeriodsDeps<T>,
) {
  return async function syncGoalFreezePeriods(): Promise<void> {
    const gen = getSyncGeneration();
    const pending = await deps.getPendingSyncFreezePeriods();
    if (pending.length === 0) return;

    const freezePeriods = pending.map(({ _syncStatus, ...fp }) => fp);
    const chunks = chunkArray(freezePeriods);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);

      if (gen !== getSyncGeneration()) return;
      await deps.markFreezePeriodsSynced(data.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markFreezePeriodsFailed(data.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertFreezePeriodsFromServer(
          data.serverWins.map(mapApiGoalFreezePeriod),
        );
      }
    }
  };
}
