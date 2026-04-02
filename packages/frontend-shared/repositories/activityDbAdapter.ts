import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type {
  ActivityIconBlob,
  ActivityIconDeleteQueueItem,
} from "@packages/domain/activity/activityRepository";
import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";

export type ActivityDbAdapter = {
  // Auth
  getUserId(): Promise<string>;
  // Order
  getNextOrderIndex(): Promise<string>;
  // Activity CRUD
  insertActivity(activity: Syncable<ActivityRecord>): Promise<void>;
  getAllActivities(): Promise<Syncable<ActivityRecord>[]>;
  getAllActivitiesIncludingDeleted(): Promise<Syncable<ActivityRecord>[]>;
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
  getAllKindsIncludingDeleted(): Promise<Syncable<ActivityKindRecord>[]>;
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
