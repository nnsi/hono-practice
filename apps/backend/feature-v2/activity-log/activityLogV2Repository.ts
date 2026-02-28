import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityLogRequest } from "@packages/types-v2";
import { activities, activityLogs } from "@infra/drizzle/schema";

type ActivityLogRow = typeof activityLogs.$inferSelect;

export type ActivityLogV2Repository = {
  getActivityLogsByUserId: (
    userId: UserId,
    since?: string,
  ) => Promise<ActivityLogRow[]>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  upsertActivityLogs: (
    userId: UserId,
    validLogs: UpsertActivityLogRequest[],
  ) => Promise<ActivityLogRow[]>;
  getActivityLogsByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<ActivityLogRow[]>;
};

export function newActivityLogV2Repository(
  db: QueryExecutor,
): ActivityLogV2Repository {
  return {
    getActivityLogsByUserId: getActivityLogsByUserId(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    upsertActivityLogs: upsertActivityLogs(db),
    getActivityLogsByIds: getActivityLogsByIds(db),
  };
}

function getActivityLogsByUserId(db: QueryExecutor) {
  return async (
    userId: UserId,
    since?: string,
  ): Promise<ActivityLogRow[]> => {
    const conditions = [eq(activityLogs.userId, userId)];
    if (since) {
      conditions.push(gt(activityLogs.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(activityLogs)
      .where(and(...conditions));
  };
}

function getOwnedActivityIds(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityIds: string[],
  ): Promise<string[]> => {
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

    return rows.map((a) => a.id);
  };
}

function upsertActivityLogs(db: QueryExecutor) {
  return async (
    userId: UserId,
    validLogs: UpsertActivityLogRequest[],
  ): Promise<ActivityLogRow[]> => {
    return await db
      .insert(activityLogs)
      .values(
        validLogs.map((log) => ({
          id: log.id,
          userId,
          activityId: log.activityId,
          activityKindId: log.activityKindId,
          quantity: log.quantity,
          memo: log.memo,
          date: log.date,
          time: log.time,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
          deletedAt: log.deletedAt ? new Date(log.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activityLogs.id,
        set: {
          activityId: sql`excluded.activity_id`,
          activityKindId: sql`excluded.activity_kind_id`,
          quantity: sql`excluded.quantity`,
          memo: sql`excluded.memo`,
          date: sql`excluded.date`,
          time: sql`excluded.done_hour`,
          createdAt: sql`excluded.created_at`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activityLogs.updatedAt, sql`excluded.updated_at`),
          eq(activityLogs.userId, userId),
        ),
      })
      .returning();
  };
}

function getActivityLogsByIds(db: QueryExecutor) {
  return async (
    userId: UserId,
    ids: string[],
  ): Promise<ActivityLogRow[]> => {
    return await db
      .select()
      .from(activityLogs)
      .where(
        and(inArray(activityLogs.id, ids), eq(activityLogs.userId, userId)),
      );
  };
}
