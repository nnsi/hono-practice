import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { eq, inArray } from "drizzle-orm";

export function hardDeleteActivitiesByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(activities)
      .where(eq(activities.userId, userId))
      .returning();
    return result.length;
  };
}

export function hardDeleteActivityKindsByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const activityRows = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.userId, userId));

    if (activityRows.length === 0) {
      return 0;
    }

    const activityIds = activityRows.map((r) => r.id);
    const result = await db
      .delete(activityKinds)
      .where(inArray(activityKinds.activityId, activityIds))
      .returning();
    return result.length;
  };
}
