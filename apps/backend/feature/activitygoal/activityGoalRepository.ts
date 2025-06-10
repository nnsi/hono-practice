import {
  createActivityGoalEntity,
  type ActivityGoal,
  type ActivityGoalId,
  type UserId,
  type ActivityId,
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
  getByActivityIdAndMonth(
    userId: UserId,
    activityId: ActivityId,
    targetMonth: string,
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
    getByActivityIdAndMonth: getByActivityIdAndMonth(db),
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
        targetMonth: row.targetMonth,
        targetQuantity: row.targetQuantity,
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
      targetMonth: row.targetMonth,
      targetQuantity: row.targetQuantity,
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
      orderBy: (goals, { desc }) => [desc(goals.targetMonth)],
    });

    return rows.map((row) =>
      createActivityGoalEntity({
        id: row.id,
        userId: row.userId,
        activityId: row.activityId,
        targetMonth: row.targetMonth,
        targetQuantity: row.targetQuantity,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: "persisted",
      }),
    );
  };
}

function getByActivityIdAndMonth(db: QueryExecutor) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    targetMonth: string,
  ): Promise<ActivityGoal | undefined> => {
    const row = await db.query.activityGoals.findFirst({
      where: and(
        eq(activityGoals.userId, userId),
        eq(activityGoals.activityId, activityId),
        eq(activityGoals.targetMonth, targetMonth),
        isNull(activityGoals.deletedAt),
      ),
    });

    if (!row) return undefined;

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      targetMonth: row.targetMonth,
      targetQuantity: row.targetQuantity,
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
        targetMonth: goal.targetMonth,
        targetQuantity: goal.targetQuantity,
        description: goal.description,
      })
      .returning();

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      targetMonth: row.targetMonth,
      targetQuantity: row.targetQuantity,
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
        targetMonth: goal.targetMonth,
        targetQuantity: goal.targetQuantity,
        description: goal.description,
        updatedAt: new Date(),
      })
      .where(eq(activityGoals.id, goal.id))
      .returning();

    return createActivityGoalEntity({
      id: row.id,
      userId: row.userId,
      activityId: row.activityId,
      targetMonth: row.targetMonth,
      targetQuantity: row.targetQuantity,
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
