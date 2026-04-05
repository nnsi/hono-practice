import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { tasks } from "@infra/drizzle/schema";
import { DomainValidateError } from "@packages/domain/errors";
import {
  type Task,
  type TaskId,
  createTaskEntity,
} from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import {
  type SQL,
  and,
  desc,
  eq,
  gte,
  isNull,
  lte,
  not,
  or,
} from "drizzle-orm";

export function getTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId, date?: string): Promise<Task[]> => {
    let whereClause: SQL | undefined;
    if (date) {
      whereClause = and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
        or(
          and(not(isNull(tasks.doneDate)), eq(tasks.doneDate, date)),
          and(
            isNull(tasks.doneDate),
            or(
              and(isNull(tasks.startDate), isNull(tasks.dueDate)),
              and(isNull(tasks.startDate), gte(tasks.dueDate, date)),
              and(lte(tasks.startDate, date), isNull(tasks.dueDate)),
              and(lte(tasks.startDate, date), gte(tasks.dueDate, date)),
            ),
          ),
        ),
      );
    } else {
      whereClause = and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
      );
    }
    const result = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: desc(tasks.createdAt),
    });
    return result.map((r) => createTaskEntity({ ...r, type: "persisted" }));
  };
}

export function getArchivedTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<Task[]> => {
    const result = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        not(isNull(tasks.archivedAt)),
      ),
      orderBy: desc(tasks.archivedAt),
    });
    return result.map((r) => {
      if (!r.doneDate || !r.archivedAt) {
        throw new DomainValidateError(
          "getArchivedTasksByUserId: archived task must have doneDate and archivedAt",
        );
      }
      return createTaskEntity({
        ...r,
        type: "archived",
        doneDate: r.doneDate,
        archivedAt: r.archivedAt,
      });
    });
  };
}

export function getTaskByUserIdAndTaskId(db: QueryExecutor) {
  return async (userId: UserId, taskId: TaskId): Promise<Task | undefined> => {
    const result = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
      ),
    });
    if (!result) return undefined;
    return createTaskEntity({ ...result, type: "persisted" });
  };
}
