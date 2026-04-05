import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activityGoalFreezePeriods } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";

export function hardDeleteGoalFreezePeriodsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(activityGoalFreezePeriods)
      .where(eq(activityGoalFreezePeriods.userId, userId))
      .returning();
    return result.length;
  };
}
