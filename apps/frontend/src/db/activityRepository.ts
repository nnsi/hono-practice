import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import {
  type ActivityDbAdapter,
  newActivityRepository,
} from "@packages/frontend-shared/repositories";
import { getServerNowISOString } from "@packages/sync-engine";
import { generateOrder } from "@packages/utils/lexicalOrder";

import { db } from "./schema";

const adapter: ActivityDbAdapter = {
  // Auth
  async getUserId() {
    const authState = await db.authState.get("current");
    if (!authState?.userId) {
      throw new Error("Cannot create activity: userId is not set");
    }
    return authState.userId;
  },

  // Order
  async getNextOrderIndex() {
    const lastActivity = await db.activities
      .orderBy("orderIndex")
      .reverse()
      .first();
    return generateOrder(lastActivity?.orderIndex ?? null, null);
  },

  // Activity CRUD
  async insertActivity(activity) {
    await db.activities.add(activity);
  },
  async getAllActivities() {
    return db.activities
      .orderBy("orderIndex")
      .filter((a) => !a.deletedAt)
      .toArray();
  },
  async updateActivity(id, changes) {
    await db.activities.update(id, changes);
  },
  async softDeleteActivityAndKinds(id, timestamp) {
    await db.activities.update(id, {
      deletedAt: timestamp,
      updatedAt: timestamp,
      _syncStatus: "pending",
    });
    await db.activityKinds
      .where("activityId")
      .equals(id)
      .modify({
        deletedAt: timestamp,
        updatedAt: timestamp,
        _syncStatus: "pending" as const,
      });
  },

  // ActivityKind CRUD
  async insertKinds(kinds) {
    await db.activityKinds.bulkAdd(kinds);
  },
  async getKindsByActivityId(activityId) {
    return db.activityKinds
      .where("activityId")
      .equals(activityId)
      .filter((k) => !k.deletedAt)
      .toArray();
  },
  async getAllKinds() {
    return db.activityKinds.filter((k) => !k.deletedAt).toArray();
  },
  async updateKind(id, changes) {
    await db.activityKinds.update(id, changes);
  },
  async insertKind(kind) {
    await db.activityKinds.add(kind);
  },

  // Reorder
  async reorderActivities(orderedIds) {
    const now = getServerNowISOString();
    await db.transaction("rw", db.activities, async () => {
      let prev: string | null = null;
      for (const id of orderedIds) {
        const orderIndex = generateOrder(prev, null);
        await db.activities.update(id, {
          orderIndex,
          updatedAt: now,
          _syncStatus: "pending" as const,
        });
        prev = orderIndex;
      }
    });
  },

  // Sync
  async getPendingSyncActivities() {
    return db.activities
      .where("_syncStatus")
      .anyOf(["pending", "failed"])
      .toArray();
  },
  async getPendingSyncActivityKinds() {
    return db.activityKinds
      .where("_syncStatus")
      .anyOf(["pending", "failed"])
      .toArray();
  },
  async updateActivitiesSyncStatus(ids, status) {
    await db.activities.where("id").anyOf(ids).modify({ _syncStatus: status });
  },
  async updateKindsSyncStatus(ids, status) {
    await db.activityKinds
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: status });
  },
  async getActivitiesByIds(ids) {
    return db.activities.where("id").anyOf(ids).toArray();
  },
  async getKindsByIds(ids) {
    return db.activityKinds.where("id").anyOf(ids).toArray();
  },
  async bulkUpsertActivities(activities) {
    await db.activities.bulkPut(activities);
  },
  async bulkUpsertKinds(kinds) {
    await db.activityKinds.bulkPut(kinds);
  },

  // Icon blob management
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

export const activityRepository = newActivityRepository(
  adapter,
) satisfies ActivityRepository;
