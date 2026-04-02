import type { ActivityDbAdapter } from "@packages/frontend-shared/repositories";
import { getServerNowISOString } from "@packages/sync-engine";

import { db } from "./schema";

export const activityIconAdapter: Pick<
  ActivityDbAdapter,
  | "saveActivityIconBlob"
  | "getActivityIconBlob"
  | "deleteActivityIconBlob"
  | "getAllIconBlobs"
  | "getPendingIconBlobs"
  | "completeActivityIconSync"
  | "clearActivityIcon"
  | "getPendingIconDeletes"
  | "removeIconDeleteQueue"
  | "cacheRemoteIcon"
> = {
  async saveActivityIconBlob(activityId, base64, mimeType) {
    await db.activityIconBlobs.put({ activityId, base64, mimeType });
  },
  async getActivityIconBlob(activityId) {
    return db.activityIconBlobs.get(activityId);
  },
  async deleteActivityIconBlob(activityId) {
    await db.activityIconBlobs.delete(activityId);
  },
  async getAllIconBlobs() {
    return db.activityIconBlobs.toArray();
  },
  async getPendingIconBlobs() {
    const all = await db.activityIconBlobs.toArray();
    return all.filter((b) => !b.synced);
  },
  async completeActivityIconSync(activityId, iconUrl, iconThumbnailUrl) {
    await db.transaction(
      "rw",
      [db.activities, db.activityIconBlobs],
      async () => {
        await db.activities.update(activityId, {
          iconUrl,
          iconThumbnailUrl,
          _syncStatus: "pending" as const,
        });
        await db.activityIconBlobs.update(activityId, { synced: true });
      },
    );
  },
  async clearActivityIcon(activityId) {
    const now = getServerNowISOString();
    await db.transaction(
      "rw",
      [db.activities, db.activityIconBlobs, db.activityIconDeleteQueue],
      async () => {
        await db.activities.update(activityId, {
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          updatedAt: now,
          _syncStatus: "pending" as const,
        });
        await db.activityIconBlobs.delete(activityId);
        await db.activityIconDeleteQueue.put({ activityId });
      },
    );
  },
  async getPendingIconDeletes() {
    return db.activityIconDeleteQueue.toArray();
  },
  async removeIconDeleteQueue(activityId) {
    await db.activityIconDeleteQueue.delete(activityId);
  },
  async cacheRemoteIcon(activityId, url) {
    const existing = await db.activityIconBlobs.get(activityId);
    if (existing) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type") || "image/webp";
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      await db.activityIconBlobs.put({
        activityId,
        base64,
        mimeType: contentType,
        synced: true,
      });
    } catch {
      // Network error -- URL表示のフォールバックがあるため無視
    }
  },
};
