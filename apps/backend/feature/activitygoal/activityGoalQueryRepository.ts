import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityGoals } from "@infra/drizzle/schema";
import type { ActivityId } from "@packages/domain/activity/activitySchema";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import {
  type ActivityGoal,
  type ActivityGoalId,
  createActivityGoalEntity,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

export function rowToEntity(
  row: typeof activityGoals.$inferSelect,
): ActivityGoal {
  return createActivityGoalEntity({
    id: row.id,
    userId: row.userId,
    activityId: row.activityId,
    dailyTargetQuantity: row.dailyTargetQuantity,
    startDate: row.startDate || "",
    endDate: row.endDate,
    isActive: row.isActive,
    description: row.description,
    debtCap: row.debtCap ?? null,
    dayTargets: parseDayTargets(row.dayTargets),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    type: "persisted",
  });
}

export function getActivityGoalsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityGoal[]> => {
    const rows = await db.query.activityGoals.findMany({
      where: and(
        eq(activityGoals.userId, userId),
        isNull(activityGoals.deletedAt),
      ),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
    return rows.map(rowToEntity);
  };
}

export function getActivityGoalByIdAndUserId(db: QueryExecutor) {
  return async (
    id: ActivityGoalId,
    userId: UserId,
  ): Promise<ActivityGoal | undefined> => {
    const row = await db.query.activityGoals.findFirst({
      where: and(
        eq(activityGoals.id, id),
        eq(activityGoals.userId, userId),
        isNull(activityGoals.deletedAt),
      ),
    });
    if (!row) return undefined;
    return rowToEntity(row);
  };
}

export function getActivityGoalsByActivityId(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal[]> => {
    const rows = await db.query.activityGoals.findMany({
      where: and(
        eq(activityGoals.userId, userId),
        eq(activityGoals.activityId, activityId),
        isNull(activityGoals.deletedAt),
      ),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
    return rows.map(rowToEntity);
  };
}

export function getActiveActivityGoalByActivityId(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal | undefined> => {
    const row = await db.query.activityGoals.findFirst({
      where: and(
        eq(activityGoals.userId, userId),
        eq(activityGoals.activityId, activityId),
        eq(activityGoals.isActive, true),
        isNull(activityGoals.deletedAt),
      ),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
    if (!row) return undefined;
    return rowToEntity(row);
  };
}

export function getActivityGoalChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{ goals: ActivityGoal[]; hasMore: boolean }> => {
    const rows = await db
      .select()
      .from(activityGoals)
      .where(
        and(
          eq(activityGoals.userId, userId),
          gt(activityGoals.updatedAt, timestamp),
        ),
      )
      .orderBy(asc(activityGoals.updatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    return { goals: rows.slice(0, limit).map(rowToEntity), hasMore };
  };
}
