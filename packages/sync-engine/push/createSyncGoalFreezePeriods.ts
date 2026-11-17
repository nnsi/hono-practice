import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { chunkArray } from "../core/chunkedSync";
import {
  type PendingSyncRecord,
  revisionsForIds,
  trackSyncResultTimestamps,
} from "../core/pushResult";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiGoalFreezePeriod } from "../mappers/apiMappers";

type SyncGoalFreezePeriodsDeps<T extends PendingSyncRecord> = {
  getPendingSyncFreezePeriods: () => Promise<T[]>;
  postChunk: (chunk: Omit<T, "_syncStatus">[]) => Promise<SyncResult>;
  markFreezePeriodsSynced: (revisions: SyncRevision[]) => Promise<void>;
  markFreezePeriodsFailed: (revisions: SyncRevision[]) => Promise<void>;
  upsertFreezePeriodsFromServer: (
    wins: ReturnType<typeof mapApiGoalFreezePeriod>[],
  ) => Promise<void>;
};

export function createSyncGoalFreezePeriods<T extends PendingSyncRecord>(
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
      trackSyncResultTimestamps(data);

      if (gen !== getSyncGeneration()) return;
      await deps.markFreezePeriodsSynced(
        revisionsForIds(pending, data.syncedIds),
      );
      if (gen !== getSyncGeneration()) return;
      await deps.markFreezePeriodsFailed(
        revisionsForIds(pending, data.skippedIds),
      );
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertFreezePeriodsFromServer(
          data.serverWins.map(mapApiGoalFreezePeriod),
        );
      }
    }
  };
}
