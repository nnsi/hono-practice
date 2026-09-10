import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { taskSchedules } from "@infra/drizzle/schema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, inArray } from "drizzle-orm";

export function getOwnedTaskScheduleIds(db: QueryExecutor) {
  return async (userId: UserId, ids: string[]): Promise<string[]> => {
    if (ids.length === 0) return [];
    // Tombstones remain valid parents for completed tasks and offline sync.
    const rows = await db
      .select({ id: taskSchedules.id })
      .from(taskSchedules)
      .where(
        and(eq(taskSchedules.userId, userId), inArray(taskSchedules.id, ids)),
      );
    return rows.map((row) => row.id);
  };
}
