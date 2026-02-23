import { activityRepository } from "../db/activityRepository";
import { db } from "../db/schema";
import { apiClient, customFetch } from "../utils/apiClient";
import { mapApiActivity, mapApiActivityKind } from "../utils/apiMappers";
import type { SyncResult } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3456";

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

  const res = await apiClient.users.v2.activities.sync.$post({
    json: {
      activities: activitiesData,
      activityKinds: kindsData,
    },
  });

  if (res.ok) {
    const data: {
      activities: SyncResult;
      activityKinds: SyncResult;
    } = await res.json();

    await activityRepository.markActivitiesSynced(
      data.activities.syncedIds,
    );
    await activityRepository.markActivitiesFailed(
      data.activities.skippedIds,
    );
    if (data.activities.serverWins.length > 0) {
      await activityRepository.upsertActivities(
        data.activities.serverWins.map(mapApiActivity),
      );
    }

    await activityRepository.markActivityKindsSynced(
      data.activityKinds.syncedIds,
    );
    await activityRepository.markActivityKindsFailed(
      data.activityKinds.skippedIds,
    );
    if (data.activityKinds.serverWins.length > 0) {
      await activityRepository.upsertActivityKinds(
        data.activityKinds.serverWins.map(mapApiActivityKind),
      );
    }
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

    if (res.ok) {
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
}
