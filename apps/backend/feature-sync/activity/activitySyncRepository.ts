import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { activities, activityKinds } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types";

import {
  getActivitiesByIds,
  getActivitiesByUserId,
  getOwnedActivityIds,
  upsertActivities,
} from "./activitySyncActivityRepository";
import {
  getActivityKindsByActivityIds,
  getActivityKindsByIds,
  upsertActivityKinds,
} from "./activitySyncKindRepository";

type ActivityRow = typeof activities.$inferSelect;
type ActivityKindRow = typeof activityKinds.$inferSelect;

export type ActivitySyncRepository = {
  getActivitiesByUserId: (userId: UserId) => Promise<ActivityRow[]>;
  getActivityKindsByActivityIds: (
    activityIds: string[],
  ) => Promise<ActivityKindRow[]>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  upsertActivities: (
    userId: UserId,
    validActivities: UpsertActivityRequest[],
  ) => Promise<ActivityRow[]>;
  getActivitiesByIds: (userId: UserId, ids: string[]) => Promise<ActivityRow[]>;
  upsertActivityKinds: (
    validKinds: UpsertActivityKindRequest[],
    ownedActivityIds: string[],
  ) => Promise<ActivityKindRow[]>;
  getActivityKindsByIds: (
    ids: string[],
    ownedActivityIds: string[],
  ) => Promise<ActivityKindRow[]>;
};

export function newActivitySyncRepository(
  db: QueryExecutor,
): ActivitySyncRepository {
  return {
    getActivitiesByUserId: getActivitiesByUserId(db),
    getActivityKindsByActivityIds: getActivityKindsByActivityIds(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    upsertActivities: upsertActivities(db),
    getActivitiesByIds: getActivitiesByIds(db),
    upsertActivityKinds: upsertActivityKinds(db),
    getActivityKindsByIds: getActivityKindsByIds(db),
  };
}
