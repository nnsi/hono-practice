import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type {
  ActivityRepository,
  CreateActivityInput,
} from "@packages/domain/activity/activityRepository";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import type { ActivityDbAdapter } from "./activityDbAdapter";
import {
  applyKindUpdates,
  applySyncMarkHelpers,
  upsertActivities,
  upsertActivityKinds,
} from "./activityRepositorySyncLogic";

export type { ActivityDbAdapter } from "./activityDbAdapter";

export function newActivityRepository(
  adapter: ActivityDbAdapter,
): ActivityRepository {
  return {
    // === Read ===
    async getAllActivities() {
      return adapter.getAllActivities();
    },
    async getAllActivitiesIncludingDeleted() {
      return adapter.getAllActivitiesIncludingDeleted();
    },
    async getActivityKindsByActivityId(activityId: string) {
      return adapter.getKindsByActivityId(activityId);
    },
    async getAllActivityKinds() {
      return adapter.getAllKinds();
    },
    async getAllActivityKindsIncludingDeleted() {
      return adapter.getAllKindsIncludingDeleted();
    },

    // === Create ===
    async createActivity(input: CreateActivityInput) {
      const now = getServerNowISOString();
      const userId = await adapter.getUserId();
      const orderIndex = await adapter.getNextOrderIndex();

      const activity: Syncable<ActivityRecord> = {
        id: uuidv7(),
        userId,
        name: input.name,
        label: "",
        emoji: input.emoji,
        iconType: input.iconType ?? "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: input.quantityUnit,
        orderIndex,
        showCombinedStats: input.showCombinedStats,
        recordingMode: input.recordingMode ?? "manual",
        recordingModeConfig: input.recordingModeConfig ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "pending",
      };

      await adapter.insertActivity(activity);

      if (input.kinds && input.kinds.length > 0) {
        const kinds: Syncable<ActivityKindRecord>[] = input.kinds.map(
          (k, i) => ({
            id: uuidv7(),
            activityId: activity.id,
            name: k.name,
            color: k.color || null,
            orderIndex: String(i).padStart(6, "0"),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            _syncStatus: "pending" as const,
          }),
        );
        await adapter.insertKinds(kinds);
      }

      return activity;
    },

    // === Update ===
    async updateActivity(id, changes, updatedKinds) {
      const now = getServerNowISOString();
      await adapter.updateActivity(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
      if (updatedKinds !== undefined) {
        await applyKindUpdates(adapter, id, updatedKinds, now);
      }
    },

    // === Reorder ===
    async reorderActivities(orderedIds) {
      await adapter.reorderActivities(orderedIds);
    },

    // === Delete ===
    async softDeleteActivity(id) {
      const now = getServerNowISOString();
      await adapter.softDeleteActivityAndKinds(id, now);
    },

    // === Sync helpers ===
    async getPendingSyncActivities() {
      return adapter.getPendingSyncActivities();
    },
    async getPendingSyncActivityKinds() {
      return adapter.getPendingSyncActivityKinds();
    },
    async markActivitiesSynced(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivitiesSynced",
        ids,
      });
    },
    async markActivityKindsSynced(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivityKindsSynced",
        ids,
      });
    },
    async markActivitiesFailed(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivitiesFailed",
        ids,
      });
    },
    async markActivityKindsFailed(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivityKindsFailed",
        ids,
      });
    },
    async markActivitiesRejected(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivitiesRejected",
        ids,
      });
    },
    async markActivityKindsRejected(ids) {
      await applySyncMarkHelpers(adapter, {
        type: "markActivityKindsRejected",
        ids,
      });
    },

    // === Icon management (platform-specific passthrough) ===
    saveActivityIconBlob: (activityId, base64, mimeType) =>
      adapter.saveActivityIconBlob(activityId, base64, mimeType),
    getActivityIconBlob: (activityId) =>
      adapter.getActivityIconBlob(activityId),
    deleteActivityIconBlob: (activityId) =>
      adapter.deleteActivityIconBlob(activityId),
    getAllIconBlobs: () => adapter.getAllIconBlobs(),
    getPendingIconBlobs: () => adapter.getPendingIconBlobs(),
    completeActivityIconSync: (activityId, iconUrl, iconThumbnailUrl) =>
      adapter.completeActivityIconSync(activityId, iconUrl, iconThumbnailUrl),
    clearActivityIcon: (activityId) => adapter.clearActivityIcon(activityId),
    getPendingIconDeletes: () => adapter.getPendingIconDeletes(),
    removeIconDeleteQueue: (activityId) =>
      adapter.removeIconDeleteQueue(activityId),
    cacheRemoteIcon: (activityId, url) =>
      adapter.cacheRemoteIcon(activityId, url),

    // === Server upsert ===
    async upsertActivities(activities) {
      await upsertActivities(adapter, activities);
    },
    async upsertActivityKinds(kinds) {
      await upsertActivityKinds(adapter, kinds);
    },
  };
}
