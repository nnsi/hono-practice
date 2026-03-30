import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type {
  ActivityIconBlob,
  ActivityIconDeleteQueueItem,
  ActivityRepository,
  CreateActivityInput,
} from "@packages/domain/activity/activityRepository";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { getServerNowISOString } from "@packages/sync-engine";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

export type ActivityDbAdapter = {
  // Auth
  getUserId(): Promise<string>;
  // Order
  getNextOrderIndex(): Promise<string>;
  // Activity CRUD
  insertActivity(activity: Syncable<ActivityRecord>): Promise<void>;
  getAllActivities(): Promise<Syncable<ActivityRecord>[]>;
  updateActivity(
    id: string,
    changes: Partial<Syncable<ActivityRecord>>,
  ): Promise<void>;
  softDeleteActivityAndKinds(id: string, timestamp: string): Promise<void>;
  // ActivityKind CRUD
  insertKinds(kinds: Syncable<ActivityKindRecord>[]): Promise<void>;
  getKindsByActivityId(
    activityId: string,
  ): Promise<Syncable<ActivityKindRecord>[]>;
  getAllKinds(): Promise<Syncable<ActivityKindRecord>[]>;
  updateKind(
    id: string,
    changes: Partial<Syncable<ActivityKindRecord>>,
  ): Promise<void>;
  insertKind(kind: Syncable<ActivityKindRecord>): Promise<void>;
  // Reorder (platform-specific ordering strategy)
  reorderActivities(orderedIds: string[]): Promise<void>;
  // Sync
  getPendingSyncActivities(): Promise<Syncable<ActivityRecord>[]>;
  getPendingSyncActivityKinds(): Promise<Syncable<ActivityKindRecord>[]>;
  updateActivitiesSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  updateKindsSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  getActivitiesByIds(ids: string[]): Promise<Syncable<ActivityRecord>[]>;
  getKindsByIds(ids: string[]): Promise<Syncable<ActivityKindRecord>[]>;
  bulkUpsertActivities(activities: Syncable<ActivityRecord>[]): Promise<void>;
  bulkUpsertKinds(kinds: Syncable<ActivityKindRecord>[]): Promise<void>;
  // Icon management (platform-specific passthrough)
  saveActivityIconBlob(
    activityId: string,
    base64: string,
    mimeType: string,
  ): Promise<void>;
  getActivityIconBlob(
    activityId: string,
  ): Promise<ActivityIconBlob | undefined>;
  deleteActivityIconBlob(activityId: string): Promise<void>;
  getAllIconBlobs(): Promise<ActivityIconBlob[]>;
  getPendingIconBlobs(): Promise<ActivityIconBlob[]>;
  completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ): Promise<void>;
  clearActivityIcon(activityId: string): Promise<void>;
  getPendingIconDeletes(): Promise<ActivityIconDeleteQueueItem[]>;
  removeIconDeleteQueue(activityId: string): Promise<void>;
  cacheRemoteIcon(activityId: string, url: string): Promise<void>;
};

export function newActivityRepository(
  adapter: ActivityDbAdapter,
): ActivityRepository {
  return {
    // === Read ===
    async getAllActivities() {
      return adapter.getAllActivities();
    },

    async getActivityKindsByActivityId(activityId: string) {
      return adapter.getKindsByActivityId(activityId);
    },

    async getAllActivityKinds() {
      return adapter.getAllKinds();
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
    async updateActivity(
      id: string,
      changes: Partial<
        Pick<
          ActivityRecord,
          "name" | "quantityUnit" | "emoji" | "showCombinedStats" | "iconType"
        >
      >,
      updatedKinds?: { id?: string; name: string; color: string }[],
    ) {
      const now = getServerNowISOString();
      await adapter.updateActivity(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });

      if (updatedKinds !== undefined) {
        const existing = await adapter.getKindsByActivityId(id);
        const updatedIds = new Set(
          updatedKinds.filter((k) => k.id).map((k) => k.id!),
        );

        // Soft-delete removed kinds
        for (const existingKind of existing) {
          if (!updatedIds.has(existingKind.id)) {
            await adapter.updateKind(existingKind.id, {
              deletedAt: now,
              updatedAt: now,
              _syncStatus: "pending",
            });
          }
        }

        // Update existing and add new kinds
        for (let i = 0; i < updatedKinds.length; i++) {
          const kind = updatedKinds[i];
          if (kind.id) {
            await adapter.updateKind(kind.id, {
              name: kind.name,
              color: kind.color || null,
              orderIndex: String(i).padStart(6, "0"),
              updatedAt: now,
              _syncStatus: "pending",
            });
          } else {
            const newKind: Syncable<ActivityKindRecord> = {
              id: uuidv7(),
              activityId: id,
              name: kind.name,
              color: kind.color || null,
              orderIndex: String(i).padStart(6, "0"),
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              _syncStatus: "pending",
            };
            await adapter.insertKind(newKind);
          }
        }
      }
    },

    // === Reorder (delegated to platform-specific adapter) ===
    async reorderActivities(orderedIds: string[]) {
      await adapter.reorderActivities(orderedIds);
    },

    // === Delete ===
    async softDeleteActivity(id: string) {
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

    async markActivitiesSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateActivitiesSyncStatus(ids, "synced");
    },

    async markActivityKindsSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateKindsSyncStatus(ids, "synced");
    },

    async markActivitiesFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateActivitiesSyncStatus(ids, "failed");
    },

    async markActivityKindsFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateKindsSyncStatus(ids, "failed");
    },

    async markActivitiesRejected(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateActivitiesSyncStatus(ids, "rejected");
    },

    async markActivityKindsRejected(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateKindsSyncStatus(ids, "rejected");
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
    async upsertActivities(activities: ActivityRecord[]) {
      if (activities.length === 0) return;
      const localRecords = await adapter.getActivitiesByIds(
        activities.map((a) => a.id),
      );
      const safe = filterSafeUpserts(activities, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertActivities(
        safe.map((a) => ({ ...a, _syncStatus: "synced" as const })),
      );
    },

    async upsertActivityKinds(kinds: ActivityKindRecord[]) {
      if (kinds.length === 0) return;
      const localRecords = await adapter.getKindsByIds(kinds.map((k) => k.id));
      const safe = filterSafeUpserts(kinds, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertKinds(
        safe.map((k) => ({ ...k, _syncStatus: "synced" as const })),
      );
    },
  };
}
