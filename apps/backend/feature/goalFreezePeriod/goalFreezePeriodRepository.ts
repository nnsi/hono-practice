import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import {
  activityGoalFreezePeriods,
  activityGoals,
} from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, isNull } from "drizzle-orm";

import { hardDeleteGoalFreezePeriodsByUserId } from "./goalFreezePeriodHardDeleteRepository";

type FreezePeriodRow = typeof activityGoalFreezePeriods.$inferSelect;

export type GoalFreezePeriodRecord = {
  id: string;
  goalId: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalFreezePeriodRepository<T = QueryExecutor> = {
  getFreezePeriodsByGoalId(
    userId: UserId,
    goalId: string,
  ): Promise<GoalFreezePeriodRecord[]>;
  getFreezePeriodByIdAndUserId(
    id: string,
    userId: UserId,
  ): Promise<GoalFreezePeriodRecord | undefined>;
  createGoalFreezePeriod(
    userId: UserId,
    goalId: string,
    startDate: string,
    endDate: string | null,
  ): Promise<GoalFreezePeriodRecord>;
  updateGoalFreezePeriod(
    id: string,
    userId: UserId,
    changes: { startDate?: string; endDate?: string | null },
  ): Promise<GoalFreezePeriodRecord>;
  deleteGoalFreezePeriod(id: string, userId: UserId): Promise<void>;
  isGoalOwnedByUser(goalId: string, userId: UserId): Promise<boolean>;
  hardDeleteGoalFreezePeriodsByUserId(userId: UserId): Promise<number>;
  withTx(tx: T): GoalFreezePeriodRepository<T>;
};

function rowToRecord(row: FreezePeriodRow): GoalFreezePeriodRecord {
  return {
    id: row.id,
    goalId: row.goalId,
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function newGoalFreezePeriodRepository(
  db: QueryExecutor,
): GoalFreezePeriodRepository<QueryExecutor> {
  return {
    getFreezePeriodsByGoalId: getFreezePeriodsByGoalId(db),
    getFreezePeriodByIdAndUserId: getFreezePeriodByIdAndUserId(db),
    createGoalFreezePeriod: createGoalFreezePeriod(db),
    updateGoalFreezePeriod: updateGoalFreezePeriod(db),
    deleteGoalFreezePeriod: deleteGoalFreezePeriod(db),
    isGoalOwnedByUser: isGoalOwnedByUser(db),
    hardDeleteGoalFreezePeriodsByUserId:
      hardDeleteGoalFreezePeriodsByUserId(db),
    withTx: (tx) => newGoalFreezePeriodRepository(tx),
  };
}

function getFreezePeriodsByGoalId(db: QueryExecutor) {
  return async (
    userId: UserId,
    goalId: string,
  ): Promise<GoalFreezePeriodRecord[]> => {
    const rows = await db
      .select()
      .from(activityGoalFreezePeriods)
      .where(
        and(
          eq(activityGoalFreezePeriods.userId, userId),
          eq(activityGoalFreezePeriods.goalId, goalId),
          isNull(activityGoalFreezePeriods.deletedAt),
        ),
      );
    return rows.map(rowToRecord);
  };
}

function getFreezePeriodByIdAndUserId(db: QueryExecutor) {
  return async (
    id: string,
    userId: UserId,
  ): Promise<GoalFreezePeriodRecord | undefined> => {
    const rows = await db
      .select()
      .from(activityGoalFreezePeriods)
      .where(
        and(
          eq(activityGoalFreezePeriods.id, id),
          eq(activityGoalFreezePeriods.userId, userId),
          isNull(activityGoalFreezePeriods.deletedAt),
        ),
      );
    const row = rows[0];
    if (!row) return undefined;
    return rowToRecord(row);
  };
}

function createGoalFreezePeriod(db: QueryExecutor) {
  return async (
    userId: UserId,
    goalId: string,
    startDate: string,
    endDate: string | null,
  ): Promise<GoalFreezePeriodRecord> => {
    const [row] = await db
      .insert(activityGoalFreezePeriods)
      .values({ userId, goalId, startDate, endDate })
      .returning();
    return rowToRecord(row);
  };
}

function updateGoalFreezePeriod(db: QueryExecutor) {
  return async (
    id: string,
    userId: UserId,
    changes: { startDate?: string; endDate?: string | null },
  ): Promise<GoalFreezePeriodRecord> => {
    const [row] = await db
      .update(activityGoalFreezePeriods)
      .set({
        ...(changes.startDate !== undefined && {
          startDate: changes.startDate,
        }),
        ...(changes.endDate !== undefined && { endDate: changes.endDate }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(activityGoalFreezePeriods.id, id),
          eq(activityGoalFreezePeriods.userId, userId),
        ),
      )
      .returning();
    return rowToRecord(row);
  };
}

function deleteGoalFreezePeriod(db: QueryExecutor) {
  return async (id: string, userId: UserId): Promise<void> => {
    await db
      .update(activityGoalFreezePeriods)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(activityGoalFreezePeriods.id, id),
          eq(activityGoalFreezePeriods.userId, userId),
        ),
      );
  };
}

function isGoalOwnedByUser(db: QueryExecutor) {
  return async (goalId: string, userId: UserId): Promise<boolean> => {
    const rows = await db
      .select({ id: activityGoals.id })
      .from(activityGoals)
      .where(
        and(
          eq(activityGoals.id, goalId),
          eq(activityGoals.userId, userId),
          isNull(activityGoals.deletedAt),
        ),
      );
    return rows.length > 0;
  };
}
