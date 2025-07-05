import {
  type ActivityGoal,
  type ActivityGoalId,
  type ActivityId,
  type UserId,
  createActivityGoalEntity,
} from "@backend/domain";
import { activityGoals } from "@infra/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type ActivityGoalRepository = {
  getByUserId(userId: UserId): Promise<ActivityGoal[]>;
  getByIdAndUserId(
    id: ActivityGoalId,
    userId: UserId,
  ): Promise<ActivityGoal | undefined>;
  getByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal[]>;
  getActiveByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal | undefined>;
  create(goal: ActivityGoal): Promise<ActivityGoal>;
  update(goal: ActivityGoal): Promise<ActivityGoal>;
  delete(goal: ActivityGoal): Promise<void>;
  withTx(tx: any): ActivityGoalRepository;
};

export function newActivityGoalRepository(
  db: QueryExecutor,
): ActivityGoalRepository {
  return {
    getByUserId: getByUserId(db),
    getByIdAndUserId: getByIdAndUserId(db),
    getByActivityId: getByActivityId(db),
    getActiveByActivityId: getActiveByActivityId(db),
    create: create(db),
    update: update(db),
    delete: deleteGoal(db),
    withTx: (tx) => newActivityGoalRepository(tx),
  };
}

function getByUserId(db: QueryExecutor) {
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

function getByIdAndUserId(db: QueryExecutor) {
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

function getByActivityId(db: QueryExecutor) {
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

function getActiveByActivityId(db: QueryExecutor) {
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

function create(db: QueryExecutor) {
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

function update(db: QueryExecutor) {
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

function deleteGoal(db: QueryExecutor) {
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
