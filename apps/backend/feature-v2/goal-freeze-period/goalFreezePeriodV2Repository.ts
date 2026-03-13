import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  activityGoalFreezePeriods,
  activityGoals,
} from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalFreezePeriodRequest } from "@packages/types";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";

type FreezePeriodRow = typeof activityGoalFreezePeriods.$inferSelect;

export type GoalFreezePeriodV2Repository = {
  getFreezePeriodsByUserId: (
    userId: UserId,
    since?: string,
  ) => Promise<FreezePeriodRow[]>;
  getFreezePeriodsByGoalIds: (
    userId: UserId,
    goalIds: string[],
  ) => Promise<FreezePeriodRow[]>;
  upsertFreezePeriods: (
    userId: UserId,
    periods: UpsertGoalFreezePeriodRequest[],
  ) => Promise<FreezePeriodRow[]>;
  getFreezePeriodsByIds: (
    userId: UserId,
    ids: string[],
  ) => Promise<FreezePeriodRow[]>;
  getOwnedGoalIds: (userId: UserId, goalIds: string[]) => Promise<string[]>;
};

export function newGoalFreezePeriodV2Repository(
  db: QueryExecutor,
): GoalFreezePeriodV2Repository {
  return {
    getFreezePeriodsByUserId: getFreezePeriodsByUserId(db),
    getFreezePeriodsByGoalIds: getFreezePeriodsByGoalIds(db),
    upsertFreezePeriods: upsertFreezePeriods(db),
    getFreezePeriodsByIds: getFreezePeriodsByIds(db),
    getOwnedGoalIds: getOwnedGoalIds(db),
  };
}

function getFreezePeriodsByUserId(db: QueryExecutor) {
  return async (userId: UserId, since?: string): Promise<FreezePeriodRow[]> => {
    const conditions = [eq(activityGoalFreezePeriods.userId, userId)];
    if (since) {
      conditions.push(gt(activityGoalFreezePeriods.updatedAt, new Date(since)));
    }

    return await db
      .select()
      .from(activityGoalFreezePeriods)
      .where(and(...conditions));
  };
}

function getFreezePeriodsByGoalIds(db: QueryExecutor) {
  return async (
    userId: UserId,
    goalIds: string[],
  ): Promise<FreezePeriodRow[]> => {
    if (goalIds.length === 0) return [];

    return await db
      .select()
      .from(activityGoalFreezePeriods)
      .where(
        and(
          eq(activityGoalFreezePeriods.userId, userId),
          inArray(activityGoalFreezePeriods.goalId, goalIds),
        ),
      );
  };
}

function upsertFreezePeriods(db: QueryExecutor) {
  return async (
    userId: UserId,
    periods: UpsertGoalFreezePeriodRequest[],
  ): Promise<FreezePeriodRow[]> => {
    return await db
      .insert(activityGoalFreezePeriods)
      .values(
        periods.map((p) => ({
          id: p.id,
          userId,
          goalId: p.goalId,
          startDate: p.startDate,
          endDate: p.endDate,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          deletedAt: p.deletedAt ? new Date(p.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: activityGoalFreezePeriods.id,
        set: {
          goalId: sql`excluded.goal_id`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
        setWhere: and(
          lt(activityGoalFreezePeriods.updatedAt, sql`excluded.updated_at`),
          eq(activityGoalFreezePeriods.userId, userId),
        ),
      })
      .returning();
  };
}

function getFreezePeriodsByIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<FreezePeriodRow[]> => {
    if (ids.length === 0) return [];

    return await db
      .select()
      .from(activityGoalFreezePeriods)
      .where(
        and(
          inArray(activityGoalFreezePeriods.id, ids),
          eq(activityGoalFreezePeriods.userId, userId),
        ),
      );
  };
}

function getOwnedGoalIds(db: QueryExecutor) {
  return async (userId: UserId, goalIds: string[]): Promise<string[]> => {
    if (goalIds.length === 0) return [];

    const rows = await db
      .select({ id: activityGoals.id })
      .from(activityGoals)
      .where(
        and(
          inArray(activityGoals.id, goalIds),
          eq(activityGoals.userId, userId),
        ),
      );

    return rows.map((r) => r.id);
  };
}
