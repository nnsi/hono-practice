import {
  type ActivityGoal,
  type ActivityGoalId,
  type ActivityId,
  type UserId,
  createActivityGoalEntity,
} from "@backend/domain";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityGoals } from "@infra/drizzle/schema";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

export type ActivityGoalRepository<T = any> = {
  getActivityGoalsByUserId(userId: UserId): Promise<ActivityGoal[]>;
  getActivityGoalByIdAndUserId(
    id: ActivityGoalId,
    userId: UserId,
  ): Promise<ActivityGoal | undefined>;
  getActivityGoalsByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal[]>;
  getActiveActivityGoalByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal | undefined>;
  createActivityGoal(goal: ActivityGoal): Promise<ActivityGoal>;
  updateActivityGoal(goal: ActivityGoal): Promise<ActivityGoal>;
  deleteActivityGoal(goal: ActivityGoal): Promise<void>;
  getActivityGoalChangesAfter(
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ): Promise<{ goals: ActivityGoal[]; hasMore: boolean }>;
  withTx(tx: T): ActivityGoalRepository<T>;
};

export function newActivityGoalRepository(
  db: QueryExecutor,
): ActivityGoalRepository<QueryExecutor> {
  return {
    getActivityGoalsByUserId: getActivityGoalsByUserId(db),
    getActivityGoalByIdAndUserId: getActivityGoalByIdAndUserId(db),
    getActivityGoalsByActivityId: getActivityGoalsByActivityId(db),
    getActiveActivityGoalByActivityId: getActiveActivityGoalByActivityId(db),
    createActivityGoal: createActivityGoal(db),
    updateActivityGoal: updateActivityGoal(db),
    deleteActivityGoal: deleteActivityGoal(db),
    getActivityGoalChangesAfter: getActivityGoalChangesAfter(db),
    withTx: (tx) => newActivityGoalRepository(tx),
  };
}

function getActivityGoalsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<ActivityGoal[]> => {
    const rows = await db.query.activityGoals.findMany({
      where: and(
        eq(activityGoals.userId, userId),
        isNull(activityGoals.deletedAt),
      ),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });

    return rows.map((row) =>
      createActivityGoalEntity({
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        dailyTargetQuantity: row.dailyTargetQuantity,
        startDate: row.startDate || "",
        endDate: row.endDate,
        isActive: row.isActive,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: "persisted",
      }),
    );
  };
}

function getActivityGoalByIdAndUserId(db: QueryExecutor) {
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

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function getActivityGoalsByActivityId(db: QueryExecutor) {
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

    return rows.map((row) =>
      createActivityGoalEntity({
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        dailyTargetQuantity: row.dailyTargetQuantity,
        startDate: row.startDate || "",
        endDate: row.endDate,
        isActive: row.isActive,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: "persisted",
      }),
    );
  };
}

function getActiveActivityGoalByActivityId(db: QueryExecutor) {
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

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function createActivityGoal(db: QueryExecutor) {
  return async (goal: ActivityGoal): Promise<ActivityGoal> => {
    if (goal.type !== "new") {
      throw new Error("Cannot create persisted goal");
    }

    const [row] = await db
      .insert(activityGoals)
      .values({
        id: goal.id,
        userId: goal.userId,
        activityId: goal.activityId,
        dailyTargetQuantity: goal.dailyTargetQuantity,
        startDate: goal.startDate,
        endDate: goal.endDate,
        isActive: goal.isActive,
        description: goal.description,
      })
      .returning();

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function updateActivityGoal(db: QueryExecutor) {
  return async (goal: ActivityGoal): Promise<ActivityGoal> => {
    if (goal.type !== "persisted") {
      throw new Error("Cannot update non-persisted goal");
    }

    const [row] = await db
      .update(activityGoals)
      .set({
        dailyTargetQuantity: goal.dailyTargetQuantity,
        startDate: goal.startDate,
        endDate: goal.endDate,
        isActive: goal.isActive,
        description: goal.description,
        updatedAt: new Date(),
      })
      .where(eq(activityGoals.id, goal.id))
      .returning();

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      dailyTargetQuantity: row.dailyTargetQuantity,
      startDate: row.startDate || "",
      endDate: row.endDate,
      isActive: row.isActive,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: "persisted",
    });
  };
}

function deleteActivityGoal(db: QueryExecutor) {
  return async (goal: ActivityGoal): Promise<void> => {
    if (goal.type !== "persisted") {
      throw new Error("Cannot delete non-persisted goal");
    }

    await db
      .update(activityGoals)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(activityGoals.id, goal.id));
  };
}

function getActivityGoalChangesAfter(db: QueryExecutor) {
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
      .limit(limit + 1); // +1 to check if there are more

    const hasMore = rows.length > limit;
    const goalsData = rows.slice(0, limit);

    const result = goalsData.map((row) =>
      createActivityGoalEntity({
        type: "persisted",
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        dailyTargetQuantity: row.dailyTargetQuantity,
        startDate: row.startDate || "",
        endDate: row.endDate,
        isActive: row.isActive,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );

    return {
      goals: result,
      hasMore,
    };
  };
}
