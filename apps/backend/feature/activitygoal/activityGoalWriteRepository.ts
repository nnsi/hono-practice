import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityGoals } from "@infra/drizzle/schema";
import type { ActivityGoal } from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";

import { rowToEntity } from "./activityGoalQueryRepository";

export function createActivityGoal(db: QueryExecutor) {
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
        debtCap: goal.debtCap ?? null,
        dayTargets: goal.dayTargets ?? null,
      })
      .returning();
    return rowToEntity(row);
  };
}

export function updateActivityGoal(db: QueryExecutor) {
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
        debtCap: goal.debtCap ?? null,
        dayTargets: goal.dayTargets ?? null,
        updatedAt: new Date(),
      })
      .where(eq(activityGoals.id, goal.id))
      .returning();
    return rowToEntity(row);
  };
}

export function deleteActivityGoal(db: QueryExecutor) {
  return async (goal: ActivityGoal): Promise<void> => {
    if (goal.type !== "persisted") {
      throw new Error("Cannot delete non-persisted goal");
    }
    await db
      .update(activityGoals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(activityGoals.id, goal.id));
  };
}

export function hardDeleteActivityGoalsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(activityGoals)
      .where(eq(activityGoals.userId, userId))
      .returning();
    return result.length;
  };
}
