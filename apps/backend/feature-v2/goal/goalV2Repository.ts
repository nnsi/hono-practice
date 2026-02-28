import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types-v2";
import { activities, activityGoals, activityLogs } from "@infra/drizzle/schema";

type GoalRow = typeof activityGoals.$inferSelect;

export type GoalV2Repository = {
  getGoalsByUserId: (
    userId: UserId,
    since?: string,
  ) => Promise<GoalRow[]>;
  getGoalActualQuantity: (
    userId: UserId,
    activityId: string,
    startDate: string,
    endDate: string,
  ) => Promise<number>;
  getOwnedActivityIds: (
    userId: UserId,
    activityIds: string[],
  ) => Promise<string[]>;
  upsertGoals: (
    userId: UserId,
    validGoals: UpsertGoalRequest[],
  ) => Promise<GoalRow[]>;
  getGoalsByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<GoalRow[]>;
};

export function newGoalV2Repository(db: QueryExecutor): GoalV2Repository {
  return {
    getGoalsByUserId: getGoalsByUserId(db),
    getGoalActualQuantity: getGoalActualQuantity(db),
    getOwnedActivityIds: getOwnedActivityIds(db),
    upsertGoals: upsertGoals(db),
    getGoalsByIds: getGoalsByIds(db),
  };
}

function getGoalsByUserId(db: QueryExecutor) {
  return async (userId: UserId, since?: string): Promise<GoalRow[]> => {
    const conditions = [eq(activityGoals.userId, userId)];
    if (since) {
      conditions.push(gt(activityGoals.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(activityGoals)
      .where(and(...conditions));
  };
}

function getGoalActualQuantity(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> => {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${activityLogs.quantity}), 0)`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          eq(activityLogs.activityId, activityId),
          sql`${activityLogs.date} >= ${startDate}`,
          sql`${activityLogs.date} <= ${endDate}`,
          isNull(activityLogs.deletedAt),
        ),
      );

    return Number(result[0]?.total ?? 0);
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

function upsertGoals(db: QueryExecutor) {
  return async (
    userId: UserId,
    validGoals: UpsertGoalRequest[],
  ): Promise<GoalRow[]> => {
    return await db
      .insert(activityGoals)
      .values(
        validGoals.map((goal) => ({
          id: goal.id,
          userId,
          activityId: goal.activityId,
          dailyTargetQuantity: goal.dailyTargetQuantity,
          startDate: goal.startDate,
          endDate: goal.endDate,
          isActive: goal.isActive,
          description: goal.description,
          createdAt: new Date(goal.createdAt),
          updatedAt: new Date(goal.updatedAt),
          deletedAt: goal.deletedAt ? new Date(goal.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activityGoals.id,
        set: {
          activityId: sql`excluded.activity_id`,
          dailyTargetQuantity: sql`excluded.daily_target_quantity`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          isActive: sql`excluded.is_active`,
          description: sql`excluded.description`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activityGoals.updatedAt, sql`excluded.updated_at`),
          eq(activityGoals.userId, userId),
        ),
      })
      .returning();
  };
}

function getGoalsByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<GoalRow[]> => {
    return await db
      .select()
      .from(activityGoals)
      .where(
        and(
          inArray(activityGoals.id, ids),
          eq(activityGoals.userId, userId),
        ),
      );
  };
}
