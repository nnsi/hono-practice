import type { ActivityRepository } from "@packages/domain/activity/activityRepository";
import {
  type ActivityDbAdapter,
  newActivityRepository,
} from "@packages/frontend-shared/repositories";
import { getServerNowISOString } from "@packages/sync-engine";
import { generateOrder } from "@packages/utils/lexicalOrder";

import { activityIconAdapter } from "./activityIconAdapter";
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
  async getAllActivitiesIncludingDeleted() {
    return db.activities.orderBy("orderIndex").toArray();
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
  async getAllKindsIncludingDeleted() {
    return db.activityKinds.toArray();
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

  // Icon blob management (extracted to activityIconAdapter.ts)
  ...activityIconAdapter,
};

export const activityRepository = newActivityRepository(
  adapter,
) satisfies ActivityRepository;
