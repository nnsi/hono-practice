import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds } from "@infra/drizzle/schema";
import {
  type Activity,
  type ActivityId,
  ActivityKindsSchema,
  createActivityEntity,
} from "@packages/domain/activity/activitySchema";
import { and, eq, isNull, sql } from "drizzle-orm";

export function createActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<Activity> => {
    const { kinds, ..._activity } = activity;

    const [result] = await db
      .insert(activities)
      .values({
        ..._activity,
        userId: activity.userId,
        showCombinedStats: activity.showCombinedStats,
      })
      .returning();

    if (!kinds || kinds.length === 0) {
      return createActivityEntity({
        ...result,
        iconType: result.iconType,
        iconUrl: result.iconUrl,
        iconThumbnailUrl: result.iconThumbnailUrl,
        kinds: [],
        type: "persisted",
      });
    }

    const activityKindResults = await db
      .insert(activityKinds)
      .values(
        kinds.map((kind) => ({
          id: kind.id,
          activityId: result.id,
          name: kind.name,
          color: kind.color && kind.color.trim() !== "" ? kind.color : null,
          orderIndex: kind.orderIndex || null,
        })),
      )
      .returning();

    return createActivityEntity({
      ...result,
      iconType: result.iconType,
      iconUrl: result.iconUrl,
      iconThumbnailUrl: result.iconThumbnailUrl,
      kinds: ActivityKindsSchema.parse(activityKindResults),
      type: "persisted",
    });
  };
}

export function updateActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<Activity> => {
    const { kinds, ..._activity } = activity;

    await db
      .update(activities)
      .set({ ..._activity, showCombinedStats: activity.showCombinedStats })
      .where(and(eq(activities.id, activity.id), isNull(activities.deletedAt)));

    await db
      .update(activityKinds)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(activityKinds.activityId, activity.id),
          isNull(activityKinds.deletedAt),
        ),
      );

    if (kinds && kinds.length > 0) {
      await db
        .insert(activityKinds)
        .values(
          kinds.map((kind) => ({
            id: kind.id || undefined,
            activityId: activity.id,
            name: kind.name,
            color: kind.color && kind.color.trim() !== "" ? kind.color : null,
            orderIndex: kind.orderIndex || null,
          })),
        )
        .onConflictDoUpdate({
          target: activityKinds.id,
          set: {
            name: sql`excluded.name`,
            color: sql`excluded.color`,
            orderIndex: sql`excluded.order_index`,
            deletedAt: sql`null`,
          },
        })
        .returning();
      activity.kinds = kinds;
    }

    return activity;
  };
}

export function deleteActivity(db: QueryExecutor) {
  return async (activity: Activity): Promise<void> => {
    await db
      .update(activities)
      .set({ deletedAt: new Date() })
      .where(eq(activities.id, activity.id));
  };
}

export function updateActivityIcon(db: QueryExecutor) {
  return async (
    activityId: ActivityId,
    iconType: "emoji" | "upload" | "generate",
    iconUrl?: string | null,
    iconThumbnailUrl?: string | null,
  ): Promise<void> => {
    await db
      .update(activities)
      .set({
        iconType,
        iconUrl: iconUrl || null,
        iconThumbnailUrl: iconThumbnailUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));
  };
}
