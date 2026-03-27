import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityRequest } from "@packages/types";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

type ActivityRow = typeof activities.$inferSelect;

export function getActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityRow[]> => {
    return await db
      .select()
      .from(activities)
      .where(and(eq(activities.userId, userId), isNull(activities.deletedAt)))
      .orderBy(activities.orderIndex);
  };
}

export function getOwnedActivityIds(db: QueryExecutor) {
  return async (userId: UserId, activityIds: string[]): Promise<string[]> => {
    if (activityIds.length === 0) return [];
    const rows = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(inArray(activities.id, activityIds), eq(activities.userId, userId)),
      );
    return rows.map((r) => r.id);
  };
}

export function upsertActivities(db: QueryExecutor) {
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
          recordingMode: activity.recordingMode,
          recordingModeConfig: activity.recordingModeConfig,
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
          recordingMode: sql`excluded.recording_mode`,
          recordingModeConfig: sql`excluded.recording_mode_config`,
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

export function getActivitiesByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<ActivityRow[]> => {
    return await db
      .select()
      .from(activities)
      .where(and(inArray(activities.id, ids), eq(activities.userId, userId)));
  };
}
