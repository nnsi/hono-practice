import {
  createSyncActivities,
  createSyncActivityIconDeletions,
  createSyncActivityIcons,
  postActivityChunkWithIsolation,
} from "@packages/sync-engine";

import { apiClient, getApiUrl } from "../api/apiClient";
import { customFetch } from "../api/customFetch";
import { getDatabase } from "../db/database";
import { activityRepository } from "../repositories/activityRepository";
import { reportError } from "../utils/errorReporter";

const API_URL = getApiUrl();

export const syncActivities = createSyncActivities({
  getPendingSyncActivities: () => activityRepository.getPendingSyncActivities(),
  getPendingSyncActivityKinds: () =>
    activityRepository.getPendingSyncActivityKinds(),
  postChunk: async (activities, activityKinds) => {
    return postActivityChunkWithIsolation({
      activities,
      activityKinds,
      post: (nextActivities, nextKinds) =>
        apiClient.users.v2.activities.sync.$post({
          json: {
            activities: nextActivities,
            activityKinds: nextKinds,
          },
        }),
    });
  },
  markActivitiesSynced: (ids) => activityRepository.markActivitiesSynced(ids),
  markActivitiesFailed: (ids) => activityRepository.markActivitiesFailed(ids),
  markActivitiesRejected: (ids) =>
    activityRepository.markActivitiesRejected(ids),
  upsertActivities: (wins) => activityRepository.upsertActivities(wins),
  markActivityKindsSynced: (ids) =>
    activityRepository.markActivityKindsSynced(ids),
  markActivityKindsFailed: (ids) =>
    activityRepository.markActivityKindsFailed(ids),
  markActivityKindsRejected: (ids) =>
    activityRepository.markActivityKindsRejected(ids),
  upsertActivityKinds: (wins) => activityRepository.upsertActivityKinds(wins),
  reportSyncIssues: ({ failedCount, rejectedCount, failures }) => {
    reportError({
      errorType: "network_error",
      message: `syncActivities issues: failed=${failedCount}, rejected=${rejectedCount}, reasons=${failures.map((f) => `${f.id}:${f.code}`).join(",")}`,
    });
  },
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
    const db = await getDatabase();
    const activity = await db.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM activities WHERE id = ?",
      [activityId],
    );
    return activity?.sync_status ?? null;
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
