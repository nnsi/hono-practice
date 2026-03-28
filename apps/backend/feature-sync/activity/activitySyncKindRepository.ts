import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityKinds } from "@infra/drizzle/schema";
import type { UpsertActivityKindRequest } from "@packages/types";
import { and, inArray, isNull, lt, sql } from "drizzle-orm";

type ActivityKindRow = typeof activityKinds.$inferSelect;

export function getActivityKindsByActivityIds(db: QueryExecutor) {
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

export function upsertActivityKinds(db: QueryExecutor) {
  return async (
    validKinds: UpsertActivityKindRequest[],
    ownedActivityIds: string[],
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
        setWhere: and(
          lt(activityKinds.updatedAt, sql`excluded.updated_at`),
          inArray(activityKinds.activityId, ownedActivityIds),
        ),
      })
      .returning();
  };
}

export function getActivityKindsByIds(db: QueryExecutor) {
  return async (
    ids: string[],
    ownedActivityIds: string[],
  ): Promise<ActivityKindRow[]> => {
    if (ids.length === 0 || ownedActivityIds.length === 0) return [];
    return await db
      .select()
      .from(activityKinds)
      .where(
        and(
          inArray(activityKinds.id, ids),
          inArray(activityKinds.activityId, ownedActivityIds),
        ),
      );
  };
}
