import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiActivity, mapApiActivityKind } from "../mappers/apiMappers";

type SyncActivitiesDeps<
  T extends { _syncStatus: string },
  K extends { _syncStatus: string },
> = {
  getPendingSyncActivities: () => Promise<T[]>;
  getPendingSyncActivityKinds: () => Promise<K[]>;
  postChunk: (
    activities: Omit<T, "_syncStatus">[],
    activityKinds: Omit<K, "_syncStatus">[],
  ) => Promise<{ activities: SyncResult; activityKinds: SyncResult }>;
  markActivitiesSynced: (ids: string[]) => Promise<void>;
  markActivitiesFailed: (ids: string[]) => Promise<void>;
  upsertActivities: (
    wins: ReturnType<typeof mapApiActivity>[],
  ) => Promise<void>;
  markActivityKindsSynced: (ids: string[]) => Promise<void>;
  markActivityKindsFailed: (ids: string[]) => Promise<void>;
  upsertActivityKinds: (
    wins: ReturnType<typeof mapApiActivityKind>[],
  ) => Promise<void>;
};

export function createSyncActivities<
  T extends { _syncStatus: string },
  K extends { _syncStatus: string },
>(deps: SyncActivitiesDeps<T, K>) {
  return async function syncActivities(): Promise<void> {
    const gen = getSyncGeneration();
    const pendingActivities = await deps.getPendingSyncActivities();
    const pendingKinds = await deps.getPendingSyncActivityKinds();

    if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

    const activitiesData = pendingActivities.map(({ _syncStatus, ...a }) => a);
    const kindsData = pendingKinds.map(({ _syncStatus, ...k }) => k);

    const activityChunks = chunkArray(activitiesData);
    const kindChunks = chunkArray(kindsData, 500);

    const maxChunks = Math.max(activityChunks.length, kindChunks.length);

    for (let i = 0; i < maxChunks; i++) {
      if (gen !== getSyncGeneration()) return;
      const data = await deps.postChunk(
        activityChunks[i] ?? [],
        kindChunks[i] ?? [],
      );

      if (gen !== getSyncGeneration()) return;
      await deps.markActivitiesSynced(data.activities.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markActivitiesFailed(data.activities.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.activities.serverWins.length > 0) {
        await deps.upsertActivities(
          data.activities.serverWins.map(mapApiActivity),
        );
        if (gen !== getSyncGeneration()) return;
      }

      await deps.markActivityKindsSynced(data.activityKinds.syncedIds);
      if (gen !== getSyncGeneration()) return;
      await deps.markActivityKindsFailed(data.activityKinds.skippedIds);
      if (gen !== getSyncGeneration()) return;
      if (data.activityKinds.serverWins.length > 0) {
        await deps.upsertActivityKinds(
          data.activityKinds.serverWins.map(mapApiActivityKind),
        );
      }
    }
  };
}
