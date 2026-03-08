import type { SyncResult } from "@packages/sync-engine";
import {
  chunkArray,
  mapApiActivity,
  mapApiActivityKind,
} from "@packages/sync-engine";

import { activityRepository } from "../db/activityRepository";
import { db } from "../db/schema";
import { apiClient, customFetch } from "../utils/apiClient";
import { getSyncGeneration } from "./syncState";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

export async function syncActivities(): Promise<void> {
  const gen = getSyncGeneration();
  const pendingActivities = await activityRepository.getPendingSyncActivities();
  const pendingKinds = await activityRepository.getPendingSyncActivityKinds();

  if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

  const activitiesData = pendingActivities.map(({ _syncStatus, ...a }) => a);
  const kindsData = pendingKinds.map(({ _syncStatus, ...k }) => k);

  const activityChunks = chunkArray(activitiesData);
  const kindChunks = chunkArray(kindsData, 500);

  // チャンクごとに即座にmark処理を実行する。
  // 全チャンク完了後の一括markだと、途中チャンク失敗時に成功分のmarkがスキップされる。
  const maxChunks = Math.max(activityChunks.length, kindChunks.length);

  for (let i = 0; i < maxChunks; i++) {
    if (gen !== getSyncGeneration()) return;
    const res = await apiClient.users.v2.activities.sync.$post({
      json: {
        activities: activityChunks[i] ?? [],
        activityKinds: kindChunks[i] ?? [],
      },
    });
    if (!res.ok) throw new Error(`syncActivities failed: ${res.status}`);

    if (gen !== getSyncGeneration()) return;
    const data = (await res.json()) as {
      activities: SyncResult;
      activityKinds: SyncResult;
    };

    await activityRepository.markActivitiesSynced(data.activities.syncedIds);
    if (gen !== getSyncGeneration()) return;
    await activityRepository.markActivitiesFailed(data.activities.skippedIds);
    if (gen !== getSyncGeneration()) return;
    if (data.activities.serverWins.length > 0) {
      await activityRepository.upsertActivities(
        data.activities.serverWins.map(mapApiActivity),
      );
      if (gen !== getSyncGeneration()) return;
    }

    await activityRepository.markActivityKindsSynced(
      data.activityKinds.syncedIds,
    );
    if (gen !== getSyncGeneration()) return;
    await activityRepository.markActivityKindsFailed(
      data.activityKinds.skippedIds,
    );
    if (gen !== getSyncGeneration()) return;
    if (data.activityKinds.serverWins.length > 0) {
      await activityRepository.upsertActivityKinds(
        data.activityKinds.serverWins.map(mapApiActivityKind),
      );
    }
  }
}

export async function syncActivityIconDeletions(): Promise<void> {
  const gen = getSyncGeneration();
  const queue = await activityRepository.getPendingIconDeletes();
  if (queue.length === 0) return;

  for (const item of queue) {
    if (gen !== getSyncGeneration()) return;
    const res = await customFetch(
      `${API_URL}/users/activities/${item.activityId}/icon`,
      { method: "DELETE" },
    );
    if (gen !== getSyncGeneration()) return;
    if (res.ok || res.status === 404) {
      await activityRepository.removeIconDeleteQueue(item.activityId);
    }
  }
}

export async function syncActivityIcons(): Promise<void> {
  const gen = getSyncGeneration();
  const blobs = await activityRepository.getPendingIconBlobs();
  if (blobs.length === 0) return;

  for (const blob of blobs) {
    if (gen !== getSyncGeneration()) return;
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

    if (!res.ok) throw new Error(`syncActivityIcons failed: ${res.status}`);
    if (gen !== getSyncGeneration()) return;

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
