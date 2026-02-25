import type { ActivityRecord, ActivityKindRecord } from "./activityRecord";
import type { Syncable } from "../sync/syncableRecord";

export type CreateActivityInput = {
  name: string;
  quantityUnit: string;
  emoji: string;
  showCombinedStats: boolean;
  iconType?: "emoji" | "upload";
  kinds?: { name: string; color: string }[];
};

export type ActivityIconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

export type ActivityIconDeleteQueueItem = {
  activityId: string;
};

export type ActivityRepository = {
  // Read
  getAllActivities(): Promise<Syncable<ActivityRecord>[]>;
  getActivityKindsByActivityId(
    activityId: string,
  ): Promise<Syncable<ActivityKindRecord>[]>;
  getAllActivityKinds(): Promise<Syncable<ActivityKindRecord>[]>;
  // Create
  createActivity(
    input: CreateActivityInput,
  ): Promise<Syncable<ActivityRecord>>;
  // Update
  updateActivity(
    id: string,
    changes: Partial<
      Pick<
        ActivityRecord,
        "name" | "quantityUnit" | "emoji" | "showCombinedStats" | "iconType"
      >
    >,
    updatedKinds?: { id?: string; name: string; color: string }[],
  ): Promise<void>;
  // Delete
  softDeleteActivity(id: string): Promise<void>;
  // Sync helpers
  getPendingSyncActivities(): Promise<Syncable<ActivityRecord>[]>;
  getPendingSyncActivityKinds(): Promise<Syncable<ActivityKindRecord>[]>;
  markActivitiesSynced(ids: string[]): Promise<void>;
  markActivityKindsSynced(ids: string[]): Promise<void>;
  markActivitiesFailed(ids: string[]): Promise<void>;
  markActivityKindsFailed(ids: string[]): Promise<void>;
  // Icon management
  saveActivityIconBlob(
    activityId: string,
    base64: string,
    mimeType: string,
  ): Promise<void>;
  getActivityIconBlob(
    activityId: string,
  ): Promise<ActivityIconBlob | undefined>;
  deleteActivityIconBlob(activityId: string): Promise<void>;
  getPendingIconBlobs(): Promise<ActivityIconBlob[]>;
  completeActivityIconSync(
    activityId: string,
    iconUrl: string,
    iconThumbnailUrl: string,
  ): Promise<void>;
  clearActivityIcon(activityId: string): Promise<void>;
  getPendingIconDeletes(): Promise<ActivityIconDeleteQueueItem[]>;
  removeIconDeleteQueue(activityId: string): Promise<void>;
  // Server upsert
  upsertActivities(activities: ActivityRecord[]): Promise<void>;
  upsertActivityKinds(kinds: ActivityKindRecord[]): Promise<void>;
};
