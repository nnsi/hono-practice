import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiGoal } from "../mappers/apiMappers";

type SyncGoalsDeps<
  T extends {
    _syncStatus: string;
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
  markGoalsSynced: (ids: string[]) => Promise<void>;
  markGoalsFailed: (ids: string[]) => Promise<void>;
  upsertGoalsFromServer: (
    wins: ReturnType<typeof mapApiGoal>[],
  ) => Promise<void>;
};

export function createSyncGoals<
  T extends {
    _syncStatus: string;
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

      if (gen !== getSyncGeneration()) return;
      await deps.markGoalsSynced(data.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markGoalsFailed(data.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.serverWins.length > 0) {
        await deps.upsertGoalsFromServer(data.serverWins.map(mapApiGoal));
      }
    }
  };
}
