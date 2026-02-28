import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types-v2";
import { activities, activityKinds } from "@infra/drizzle/schema";

type ActivityRow = typeof activities.$inferSelect;
type ActivityKindRow = typeof activityKinds.$inferSelect;

export type ActivityV2Repository = {
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
  getActivitiesByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<ActivityRow[]>;
  upsertActivityKinds: (
    validKinds: UpsertActivityKindRequest[],
  ) => Promise<ActivityKindRow[]>;
  getActivityKindsByIds: (ids: string[]) => Promise<ActivityKindRow[]>;
};

export function newActivityV2Repository(
  db: QueryExecutor,
): ActivityV2Repository {
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

function getActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityRow[]> => {
    return await db
      .select()
      .from(activities)
      .where(and(eq(activities.userId, userId), isNull(activities.deletedAt)))
      .orderBy(activities.orderIndex);
  };
}

function getActivityKindsByActivityIds(db: QueryExecutor) {
  return async (activityIds: string[]): Promise<ActivityKindRow[]> => {
    if (activityIds.length === 0) return [];
    return await db
      .select()
      .from(activityKinds)
      .where(
        and(
          inArray(activityKinds.activityId, activityIds),
          isNull(activityKinds.deletedAt),
        ),
      );
  };
}

function getOwnedActivityIds(db: QueryExecutor) {
  return async (userId: UserId, activityIds: string[]): Promise<string[]> => {
    if (activityIds.length === 0) return [];
    const rows = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          inArray(activities.id, activityIds),
          eq(activities.userId, userId),
        ),
      );
    return rows.map((r) => r.id);
  };
}

function upsertActivities(db: QueryExecutor) {
  return async (
    userId: UserId,
    validActivities: UpsertActivityRequest[],
  ): Promise<ActivityRow[]> => {
    return await db
      .insert(activities)
      .values(
        validActivities.map((activity) => ({
          id: activity.id,
          userId,
          name: activity.name,
          label: activity.label,
          emoji: activity.emoji,
          iconType: activity.iconType,
          iconUrl: activity.iconUrl,
          iconThumbnailUrl: activity.iconThumbnailUrl,
          description: activity.description,
          quantityUnit: activity.quantityUnit,
          orderIndex: activity.orderIndex,
          showCombinedStats: activity.showCombinedStats,
          createdAt: new Date(activity.createdAt),
          updatedAt: new Date(activity.updatedAt),
          deletedAt: activity.deletedAt ? new Date(activity.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          name: sql`excluded.name`,
          label: sql`excluded.label`,
          emoji: sql`excluded.emoji`,
          iconType: sql`excluded.icon_type`,
          iconUrl: sql`COALESCE(excluded.icon_url, ${activities.iconUrl})`,
          iconThumbnailUrl: sql`COALESCE(excluded.icon_thumbnail_url, ${activities.iconThumbnailUrl})`,
          description: sql`excluded.description`,
          quantityUnit: sql`excluded.quantity_unit`,
          orderIndex: sql`excluded.order_index`,
          showCombinedStats: sql`excluded.show_combined_stats`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activities.updatedAt, sql`excluded.updated_at`),
          eq(activities.userId, userId),
        ),
      })
      .returning();
  };
}

function getActivitiesByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<ActivityRow[]> => {
    return await db
      .select()
      .from(activities)
      .where(and(inArray(activities.id, ids), eq(activities.userId, userId)));
  };
}

function upsertActivityKinds(db: QueryExecutor) {
  return async (
    validKinds: UpsertActivityKindRequest[],
  ): Promise<ActivityKindRow[]> => {
    return await db
      .insert(activityKinds)
      .values(
        validKinds.map((kind) => ({
          id: kind.id,
          activityId: kind.activityId,
          name: kind.name,
          color: kind.color,
          orderIndex: kind.orderIndex,
          createdAt: new Date(kind.createdAt),
          updatedAt: new Date(kind.updatedAt),
          deletedAt: kind.deletedAt ? new Date(kind.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activityKinds.id,
        set: {
          activityId: sql`excluded.activity_id`,
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          orderIndex: sql`excluded.order_index`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: lt(activityKinds.updatedAt, sql`excluded.updated_at`),
      })
      .returning();
  };
}

function getActivityKindsByIds(db: QueryExecutor) {
  return async (ids: string[]): Promise<ActivityKindRow[]> => {
    return await db
      .select()
      .from(activityKinds)
      .where(inArray(activityKinds.id, ids));
  };
}
