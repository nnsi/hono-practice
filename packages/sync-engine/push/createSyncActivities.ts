import type { SyncRevision } from "@packages/domain/sync/syncableRecord";

import { chunkArray } from "../core/chunkedSync";
import type { SyncResult } from "../core/syncResult";
import { getSyncGeneration } from "../core/syncState";
import { mapApiActivity, mapApiActivityKind } from "../mappers/apiMappers";

type SyncActivitiesDeps<T extends SyncRecord, K extends SyncRecord> = {
  getPendingSyncActivities: () => Promise<T[]>;
  getPendingSyncActivityKinds: () => Promise<K[]>;
  postChunk: (
    activities: Omit<T, "_syncStatus">[],
    activityKinds: Omit<K, "_syncStatus">[],
  ) => Promise<{ activities: SyncResult; activityKinds: SyncResult }>;
  markActivitiesSynced: (revisions: SyncRevision[]) => Promise<void>;
  markActivitiesFailed: (revisions: SyncRevision[]) => Promise<void>;
  markActivitiesRejected: (revisions: SyncRevision[]) => Promise<void>;
  upsertActivities: (
    wins: ReturnType<typeof mapApiActivity>[],
  ) => Promise<void>;
  markActivityKindsSynced: (revisions: SyncRevision[]) => Promise<void>;
  markActivityKindsFailed: (revisions: SyncRevision[]) => Promise<void>;
  markActivityKindsRejected: (revisions: SyncRevision[]) => Promise<void>;
  upsertActivityKinds: (
    wins: ReturnType<typeof mapApiActivityKind>[],
  ) => Promise<void>;
  reportSyncIssues?: (summary: {
    failedCount: number;
    rejectedCount: number;
    failures: { id: string; code: string; message: string }[];
  }) => void;
};

type SyncRecord = {
  id: string;
  updatedAt: string;
  _syncStatus: string;
};

function revisionsForIds<T extends SyncRecord>(
  records: T[],
  ids: string[],
): SyncRevision[] {
  const idSet = new Set(ids);
  return records
    .filter((record) => idSet.has(record.id))
    .map((record) => ({ id: record.id, updatedAt: record.updatedAt }));
}

export function createSyncActivities<
  T extends SyncRecord,
  K extends SyncRecord,
>(deps: SyncActivitiesDeps<T, K>) {
  return async function syncActivities(): Promise<void> {
    const gen = getSyncGeneration();
    const pendingActivities = await deps.getPendingSyncActivities();
    const pendingKinds = await deps.getPendingSyncActivityKinds();

    if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

    const activityChunks = chunkArray(pendingActivities);
    const kindChunks = chunkArray(pendingKinds, 500);

    const maxChunks = Math.max(activityChunks.length, kindChunks.length);

    for (let i = 0; i < maxChunks; i++) {
      if (gen !== getSyncGeneration()) return;
      const activityChunk = activityChunks[i] ?? [];
      const kindChunk = kindChunks[i] ?? [];
      const activitiesData = activityChunk.map(
        ({ _syncStatus, ...record }) => record,
      );
      const kindsData = kindChunk.map(({ _syncStatus, ...record }) => record);
      const data = await deps.postChunk(activitiesData, kindsData);

      if (gen !== getSyncGeneration()) return;
      await deps.markActivitiesSynced(
        revisionsForIds(activityChunk, data.activities.syncedIds),
      );
      if (gen !== getSyncGeneration()) return;
      const activityFailures = data.activities.failures ?? [];
      const failedActivityIds = [
        ...data.activities.skippedIds,
        ...activityFailures.filter((f) => f.retryable).map((f) => f.id),
      ];
      const rejectedActivityIds = activityFailures
        .filter((f) => !f.retryable)
        .map((f) => f.id);
      await deps.markActivitiesFailed(
        revisionsForIds(activityChunk, failedActivityIds),
      );
      if (gen !== getSyncGeneration()) return;
      await deps.markActivitiesRejected(
        revisionsForIds(activityChunk, rejectedActivityIds),
      );
      if (gen !== getSyncGeneration()) return;
      if (data.activities.serverWins.length > 0) {
        await deps.upsertActivities(
          data.activities.serverWins.map(mapApiActivity),
        );
        if (gen !== getSyncGeneration()) return;
      }

      await deps.markActivityKindsSynced(
        revisionsForIds(kindChunk, data.activityKinds.syncedIds),
      );
      if (gen !== getSyncGeneration()) return;
      const kindFailures = data.activityKinds.failures ?? [];
      const failedKindIds = [
        ...data.activityKinds.skippedIds,
        ...kindFailures.filter((f) => f.retryable).map((f) => f.id),
      ];
      const rejectedKindIds = kindFailures
        .filter((f) => !f.retryable)
        .map((f) => f.id);
      await deps.markActivityKindsFailed(
        revisionsForIds(kindChunk, failedKindIds),
      );
      if (gen !== getSyncGeneration()) return;
      await deps.markActivityKindsRejected(
        revisionsForIds(kindChunk, rejectedKindIds),
      );
      if (gen !== getSyncGeneration()) return;
      if (data.activityKinds.serverWins.length > 0) {
        await deps.upsertActivityKinds(
          data.activityKinds.serverWins.map(mapApiActivityKind),
        );
      }

      const failedCount = failedActivityIds.length + failedKindIds.length;
      const rejectedCount = rejectedActivityIds.length + rejectedKindIds.length;
      if (failedCount > 0 || rejectedCount > 0) {
        deps.reportSyncIssues?.({
          failedCount,
          rejectedCount,
          failures: [...activityFailures, ...kindFailures],
        });
      }
    }
  };
}
