import { activityRepository } from "../db/activityRepository";
import { db } from "../db/schema";
import { apiClient, customFetch } from "../utils/apiClient";
import { mapApiActivity, mapApiActivityKind } from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";
import { chunkArray, mergeSyncResults } from "@packages/domain/sync/chunkedSync";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3456").replace(
  /\/+$/,
  "",
);

export async function syncActivities(): Promise<void> {
  const pendingActivities =
    await activityRepository.getPendingSyncActivities();
  const pendingKinds =
    await activityRepository.getPendingSyncActivityKinds();

  if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

  const activitiesData = pendingActivities.map(
    ({ _syncStatus, ...a }) => a,
  );
  const kindsData = pendingKinds.map(({ _syncStatus, ...k }) => k);

  const activityChunks = chunkArray(activitiesData);
  const kindChunks = chunkArray(kindsData, 500);

  const maxChunks = Math.max(activityChunks.length, kindChunks.length);
  const activityResults: SyncResult[] = [];
  const kindResults: SyncResult[] = [];

  for (let i = 0; i < maxChunks; i++) {
    const res = await apiClient.users.v2.activities.sync.$post({
      json: {
        activities: activityChunks[i] ?? [],
        activityKinds: kindChunks[i] ?? [],
      },
    });
    if (!res.ok) return;

    const data = await res.json() as {
      activities: SyncResult;
      activityKinds: SyncResult;
    };
    activityResults.push(data.activities);
    kindResults.push(data.activityKinds);
  }

  const activityData = mergeSyncResults(activityResults);
  await activityRepository.markActivitiesSynced(activityData.syncedIds);
  await activityRepository.markActivitiesFailed(activityData.skippedIds);
  if (activityData.serverWins.length > 0) {
    await activityRepository.upsertActivities(
      activityData.serverWins.map(mapApiActivity),
    );
  }

  const kindData = mergeSyncResults(kindResults);
  await activityRepository.markActivityKindsSynced(kindData.syncedIds);
  await activityRepository.markActivityKindsFailed(kindData.skippedIds);
  if (kindData.serverWins.length > 0) {
    await activityRepository.upsertActivityKinds(
      kindData.serverWins.map(mapApiActivityKind),
    );
  }
}

export async function syncActivityIconDeletions(): Promise<void> {
  const queue = await activityRepository.getPendingIconDeletes();
  if (queue.length === 0) return;

  for (const item of queue) {
    const res = await customFetch(
      `${API_URL}/users/activities/${item.activityId}/icon`,
      { method: "DELETE" },
    );
    if (res.ok || res.status === 404) {
      await activityRepository.removeIconDeleteQueue(item.activityId);
    }
  }
}

export async function syncActivityIcons(): Promise<void> {
  const blobs = await activityRepository.getPendingIconBlobs();
  if (blobs.length === 0) return;

  for (const blob of blobs) {
    const activity = await db.activities.get(blob.activityId);
    if (!activity || activity._syncStatus !== "synced") continue;

    const res = await customFetch(
      `${API_URL}/users/activities/${blob.activityId}/icon`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: blob.base64,
          mimeType: blob.mimeType,
        }),
      },
    );

    if (!res.ok) continue;

    const data = (await res.json()) as {
      iconUrl: string;
      iconThumbnailUrl: string;
    };
    await activityRepository.completeActivityIconSync(
      blob.activityId,
      data.iconUrl,
      data.iconThumbnailUrl,
    );
  }
}
