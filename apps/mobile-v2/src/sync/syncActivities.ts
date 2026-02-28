import { activityRepository } from "../repositories/activityRepository";
import { apiClient, customFetch, getApiUrl } from "../utils/apiClient";
import { getDatabase } from "../db/database";
import {
  mapApiActivity,
  mapApiActivityKind,
} from "@packages/domain/sync/apiMappers";
import type { SyncResult } from "@packages/domain/sync/syncResult";

const API_URL = getApiUrl();

export async function syncActivities(): Promise<void> {
  const pendingActivities =
    await activityRepository.getPendingSyncActivities();
  const pendingKinds =
    await activityRepository.getPendingSyncActivityKinds();

  if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

  // Strip _syncStatus before sending to server
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

  if (!res.ok) return;

  const data: {
    activities: SyncResult;
    activityKinds: SyncResult;
  } = await res.json();

  await activityRepository.markActivitiesSynced(data.activities.syncedIds);
  await activityRepository.markActivitiesFailed(data.activities.skippedIds);
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

  const db = await getDatabase();
  for (const blob of blobs) {
    const activity = await db.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM activities WHERE id = ?",
      [blob.activityId],
    );
    if (!activity || activity.sync_status !== "synced") continue;

    const res = await customFetch(
      `${API_URL}/users/activities/${blob.activityId}/icon`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: blob.base64, mimeType: blob.mimeType }),
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
