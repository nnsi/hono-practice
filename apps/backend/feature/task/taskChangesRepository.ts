import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { tasks } from "@infra/drizzle/schema";
import { createTaskEntity } from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, asc, eq, gt } from "drizzle-orm";

export function getTaskChangesAfter(db: QueryExecutor) {
  return async (
    userId: UserId,
    timestamp: Date,
    limit = 100,
  ): Promise<{
    tasks: ReturnType<typeof createTaskEntity>[];
    hasMore: boolean;
  }> => {
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gt(tasks.updatedAt, timestamp)))
      .orderBy(asc(tasks.updatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const tasksData = rows.slice(0, limit);

    const result = tasksData.map((row) => {
      if (row.archivedAt && row.doneDate) {
        return createTaskEntity({
          type: "archived",
          id: row.id,
          userId: row.userId,
          title: row.title,
          memo: row.memo || "",
          startDate: row.startDate || undefined,
          dueDate: row.dueDate || undefined,
          doneDate: row.doneDate,
          archivedAt: row.archivedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return createTaskEntity({
        type: "persisted",
        id: row.id,
        userId: row.userId,
        title: row.title,
        memo: row.memo || "",
        startDate: row.startDate || undefined,
        dueDate: row.dueDate || undefined,
        doneDate: row.doneDate || undefined,
        archivedAt: row.archivedAt || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });

    return { tasks: result, hasMore };
  };
}
