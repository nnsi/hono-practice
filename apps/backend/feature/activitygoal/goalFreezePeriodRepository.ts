import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityGoalFreezePeriods } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, inArray, isNull } from "drizzle-orm";

type FreezePeriodRow = typeof activityGoalFreezePeriods.$inferSelect;

export type GoalFreezePeriodRepository = {
  getFreezePeriodsByGoalIds: (
    userId: UserId,
    goalIds: string[],
  ) => Promise<FreezePeriodRow[]>;
};

export function newGoalFreezePeriodRepository(
  db: QueryExecutor,
): GoalFreezePeriodRepository {
  return {
    getFreezePeriodsByGoalIds: getFreezePeriodsByGoalIds(db),
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
          isNull(activityGoalFreezePeriods.deletedAt),
        ),
      );
  };
}
