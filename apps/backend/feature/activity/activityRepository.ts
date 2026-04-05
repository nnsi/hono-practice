import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type {
  Activity,
  ActivityId,
  ActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";

import { getActivityChangesAfter } from "./activityChangesRepository";
import {
  hardDeleteActivitiesByUserId,
  hardDeleteActivityKindsByUserId,
} from "./activityHardDeleteRepository";
import {
  getActivitiesByIdsAndUserId,
  getActivitiesByUserId,
  getActivityByIdAndUserId,
  getActivityByUserIdAndActivityKindId,
  getLastOrderIndexByUserId,
} from "./activityQueryRepository";
import {
  createActivity,
  deleteActivity,
  updateActivity,
  updateActivityIcon,
} from "./activityWriteRepository";

export type ActivityRepository<T = QueryExecutor> = {
  getActivitiesByUserId(userId: UserId): Promise<Activity[]>;
  getActivitiesByIdsAndUserId(
    userId: UserId,
    ids: ActivityId[],
  ): Promise<Activity[]>;
  getActivityByIdAndUserId(
    userId: UserId,
    id: ActivityId,
  ): Promise<Activity | undefined>;
  getActivityByUserIdAndActivityKindId(
    userId: UserId,
    activityKindId: ActivityKindId,
  ): Promise<Activity | undefined>;
  getLastOrderIndexByUserId(userId: UserId): Promise<string | undefined>;
  createActivity(activity: Activity): Promise<Activity>;
  updateActivity(activity: Activity): Promise<Activity>;
  updateActivityIcon(
    activityId: ActivityId,
    iconType: "emoji" | "upload" | "generate",
    iconUrl?: string | null,
    iconThumbnailUrl?: string | null,
  ): Promise<void>;
  deleteActivity(activity: Activity): Promise<void>;
  getActivityChangesAfter(
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ): Promise<{ activities: Activity[]; hasMore: boolean }>;
  hardDeleteActivitiesByUserId(userId: UserId): Promise<number>;
  hardDeleteActivityKindsByUserId(userId: UserId): Promise<number>;
  withTx(tx: T): ActivityRepository<T>;
};

export function newActivityRepository(
  db: QueryExecutor,
): ActivityRepository<QueryExecutor> {
  return {
    getActivitiesByUserId: getActivitiesByUserId(db),
    getActivitiesByIdsAndUserId: getActivitiesByIdsAndUserId(db),
    getActivityByIdAndUserId: getActivityByIdAndUserId(db),
    getActivityByUserIdAndActivityKindId:
      getActivityByUserIdAndActivityKindId(db),
    getLastOrderIndexByUserId: getLastOrderIndexByUserId(db),
    createActivity: createActivity(db),
    updateActivity: updateActivity(db),
    updateActivityIcon: updateActivityIcon(db),
    deleteActivity: deleteActivity(db),
    getActivityChangesAfter: getActivityChangesAfter(db),
    hardDeleteActivitiesByUserId: hardDeleteActivitiesByUserId(db),
    hardDeleteActivityKindsByUserId: hardDeleteActivityKindsByUserId(db),
    withTx: (tx) => newActivityRepository(tx),
  };
}
