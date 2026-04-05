import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { activities, activityKinds } from "@infra/drizzle/schema";
import { ActivityKindsSchema } from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, asc, eq, gt, isNull } from "drizzle-orm";

import { rowToActivity } from "./activityQueryRepository";

export function getActivityChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{
    activities: ReturnType<typeof rowToActivity>[];
    hasMore: boolean;
  }> => {
    const rows = await db
      .select()
      .from(activities)
      .where(
        and(eq(activities.userId, userId), gt(activities.updatedAt, timestamp)),
      )
      .orderBy(asc(activities.updatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const activitiesData = rows.slice(0, limit);

    const activitiesWithKinds = await Promise.all(
      activitiesData.map(async (row) => {
        const kindsRows = await db
          .select()
          .from(activityKinds)
          .where(
            and(
              eq(activityKinds.activityId, row.id),
              isNull(activityKinds.deletedAt),
            ),
          )
          .orderBy(asc(activityKinds.orderIndex));
        return rowToActivity(row, ActivityKindsSchema.parse(kindsRows));
      }),
    );

    return { activities: activitiesWithKinds, hasMore };
  };
}
