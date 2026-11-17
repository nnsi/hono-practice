import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { chunkArray } from "../core/chunkedSync";
import {
  type PendingSyncRecord,
  revisionsForIds,
  trackSyncResultTimestamps,
} from "../core/pushResult";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiGoal } from "../mappers/apiMappers";

type SyncGoalsDeps<
  T extends PendingSyncRecord & {
    currentBalance: unknown;
    totalTarget: unknown;
    totalActual: unknown;
  },
> = {
  getPendingSyncGoals: () => Promise<T[]>;
  postChunk: (
    chunk: Omit<
      T,
      "_syncStatus" | "currentBalance" | "totalTarget" | "totalActual"
    >[],
  ) => Promise<SyncResult>;
  markGoalsSynced: (revisions: SyncRevision[]) => Promise<void>;
  markGoalsFailed: (revisions: SyncRevision[]) => Promise<void>;
  upsertGoalsFromServer: (
    wins: ReturnType<typeof mapApiGoal>[],
  ) => Promise<void>;
};

export function createSyncGoals<
  T extends PendingSyncRecord & {
    currentBalance: unknown;
    totalTarget: unknown;
    totalActual: unknown;
  },
>(deps: SyncGoalsDeps<T>) {
  return async function syncGoals(): Promise<void> {
    const gen = getSyncGeneration();
    const pending = await deps.getPendingSyncGoals();
    if (pending.length === 0) return;

    const goals = pending.map(
      ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
    );
    const chunks = chunkArray(goals);

    for (const chunk of chunks) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(chunk);
      trackSyncResultTimestamps(data);

      if (gen !== getSyncGeneration()) return;
      await deps.markGoalsSynced(revisionsForIds(pending, data.syncedIds));
      if (gen !== getSyncGeneration()) return;
      await deps.markGoalsFailed(revisionsForIds(pending, data.skippedIds));
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertGoalsFromServer(data.serverWins.map(mapApiGoal));
      }
    }
  };
}
