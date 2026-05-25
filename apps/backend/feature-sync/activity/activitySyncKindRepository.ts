import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityKindRequest } from "@packages/types";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

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

// userId 経由で kinds を取得する。GET /users/v2/activities で activities の SELECT 完了を
// 待たずに並列実行するため。INNER JOIN で deletedAt = NULL の activity に属する kinds のみ返す。
export function getActivityKindsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityKindRow[]> => {
    const rows = await db
      .select({
        id: activityKinds.id,
        activityId: activityKinds.activityId,
        name: activityKinds.name,
        color: activityKinds.color,
        orderIndex: activityKinds.orderIndex,
        createdAt: activityKinds.createdAt,
        updatedAt: activityKinds.updatedAt,
        deletedAt: activityKinds.deletedAt,
      })
      .from(activityKinds)
      .innerJoin(activities, eq(activityKinds.activityId, activities.id))
      .where(
        and(
          eq(activities.userId, userId),
          isNull(activities.deletedAt),
          isNull(activityKinds.deletedAt),
        ),
      );
    return rows;
  };
}

export function upsertActivityKinds(db: QueryExecutor) {
  return async (
    validKinds: UpsertActivityKindRequest[],
    ownedActivityIds: string[],
  ): Promise<ActivityKindRow[]> => {
    const rows = await db
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
          updatedAt: sql`GREATEST(excluded.updated_at, NOW())`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activityKinds.updatedAt, sql`excluded.updated_at`),
          inArray(activityKinds.activityId, ownedActivityIds),
        ),
      })
      .returning();

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(activityKinds)
        .set({ updatedAt: sql`NOW()` })
        .where(
          and(
            inArray(activityKinds.id, ids),
            lt(activityKinds.updatedAt, sql`NOW()`),
          ),
        );
    }

    return rows;
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
