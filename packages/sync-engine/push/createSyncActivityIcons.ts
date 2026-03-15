import { getSyncGeneration } from "../core/syncState";

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

type SyncActivityIconDeletionsDeps = {
  getPendingIconDeletes: () => Promise<{ activityId: string }[]>;
  deleteIcon: (activityId: string) => Promise<Response>;
  removeIconDeleteQueue: (activityId: string) => Promise<void>;
};

export function createSyncActivityIconDeletions(
  deps: SyncActivityIconDeletionsDeps,
) {
  return async function syncActivityIconDeletions(): Promise<void> {
    const gen = getSyncGeneration();
    const queue = await deps.getPendingIconDeletes();
    if (queue.length === 0) return;

    for (const item of queue) {
      if (gen !== getSyncGeneration()) return;
      const res = await deps.deleteIcon(item.activityId);
      if (gen !== getSyncGeneration()) return;
      if (res.ok || res.status === 404) {
        await deps.removeIconDeleteQueue(item.activityId);
      }
    }
  };
}

type SyncActivityIconsDeps = {
  getPendingIconBlobs: () => Promise<IconBlob[]>;
  getActivitySyncStatus: (activityId: string) => Promise<string | null>;
  uploadIcon: (
    activityId: string,
    base64: string,
    mimeType: string,
  ) => Promise<{ iconUrl: string; iconThumbnailUrl: string }>;
  completeActivityIconSync: (
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ) => Promise<void>;
};

export function createSyncActivityIcons(deps: SyncActivityIconsDeps) {
  return async function syncActivityIcons(): Promise<void> {
    const gen = getSyncGeneration();
    const blobs = await deps.getPendingIconBlobs();
    if (blobs.length === 0) return;

    for (const blob of blobs) {
      if (gen !== getSyncGeneration()) return;
      const syncStatus = await deps.getActivitySyncStatus(blob.activityId);
      if (syncStatus !== "synced") continue;

      const data = await deps.uploadIcon(
        blob.activityId,
        blob.base64,
        blob.mimeType,
      );
      if (gen !== getSyncGeneration()) return;

      await deps.completeActivityIconSync(
        blob.activityId,
        data.iconUrl,
        data.iconThumbnailUrl,
      );
    }
  };
}
