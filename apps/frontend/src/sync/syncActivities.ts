import type { SyncResult } from "@packages/sync-engine";
import {
  createSyncActivities,
  createSyncActivityIconDeletions,
  createSyncActivityIcons,
} from "@packages/sync-engine";

import { activityRepository } from "../db/activityRepository";
import { db } from "../db/schema";
import { apiClient, customFetch } from "../utils/apiClient";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

export const syncActivities = createSyncActivities({
  getPendingSyncActivities: () => activityRepository.getPendingSyncActivities(),
  getPendingSyncActivityKinds: () =>
    activityRepository.getPendingSyncActivityKinds(),
  postChunk: async (activities, activityKinds) => {
    const res = await apiClient.users.v2.activities.sync.$post({
      json: { activities, activityKinds },
    });
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        // バリデーションエラー等 → リトライしても治らないので "rejected" にして除外
        console.warn(`syncActivities rejected (${res.status})`);
        const aIds = activities.map((a) => (a as { id: string }).id);
        const kIds = activityKinds.map((k) => (k as { id: string }).id);
        if (aIds.length > 0)
          await activityRepository.markActivitiesRejected(aIds);
        if (kIds.length > 0)
          await activityRepository.markActivityKindsRejected(kIds);
        return {
          activities: { syncedIds: [], skippedIds: [], serverWins: [] },
          activityKinds: { syncedIds: [], skippedIds: [], serverWins: [] },
        };
      }
      throw new Error(`syncActivities failed: ${res.status}`);
    }
    return (await res.json()) as {
      activities: SyncResult;
      activityKinds: SyncResult;
    };
  },
  markActivitiesSynced: (ids) => activityRepository.markActivitiesSynced(ids),
  markActivitiesFailed: (ids) => activityRepository.markActivitiesFailed(ids),
  upsertActivities: (wins) => activityRepository.upsertActivities(wins),
  markActivityKindsSynced: (ids) =>
    activityRepository.markActivityKindsSynced(ids),
  markActivityKindsFailed: (ids) =>
    activityRepository.markActivityKindsFailed(ids),
  upsertActivityKinds: (wins) => activityRepository.upsertActivityKinds(wins),
});

export const syncActivityIconDeletions = createSyncActivityIconDeletions({
  getPendingIconDeletes: () => activityRepository.getPendingIconDeletes(),
  deleteIcon: (activityId) =>
    customFetch(`${API_URL}/users/activities/${activityId}/icon`, {
      method: "DELETE",
    }),
  removeIconDeleteQueue: (activityId) =>
    activityRepository.removeIconDeleteQueue(activityId),
});

export const syncActivityIcons = createSyncActivityIcons({
  getPendingIconBlobs: () => activityRepository.getPendingIconBlobs(),
  getActivitySyncStatus: async (activityId) => {
    const activity = await db.activities.get(activityId);
    return activity?._syncStatus ?? null;
  },
  uploadIcon: async (activityId, base64, mimeType) => {
    const res = await customFetch(
      `${API_URL}/users/activities/${activityId}/icon`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimeType }),
      },
    );
    if (!res.ok) throw new Error(`syncActivityIcons failed: ${res.status}`);
    return (await res.json()) as {
      iconUrl: string;
      iconThumbnailUrl: string;
    };
  },
  completeActivityIconSync: (activityId, iconUrl, iconThumbnailUrl) =>
    activityRepository.completeActivityIconSync(
      activityId,
      iconUrl,
      iconThumbnailUrl,
    ),
});
