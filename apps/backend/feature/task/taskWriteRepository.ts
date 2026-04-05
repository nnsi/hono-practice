import { ResourceNotFoundError } from "@backend/error";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { tasks } from "@infra/drizzle/schema";
import { DomainValidateError } from "@packages/domain/errors";
import {
  type Task,
  type TaskId,
  TaskSchema,
  createTaskEntity,
} from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, isNull } from "drizzle-orm";

export function createTask(db: QueryExecutor) {
  return async (task: Task): Promise<Task> => {
    const [result] = await db.insert(tasks).values(task).returning();
    const persistedTask = TaskSchema.safeParse({
      ...result,
      type: "persisted",
    });
    if (!persistedTask.success) {
      throw new DomainValidateError("createTask: failed to parse task");
    }
    return persistedTask.data;
  };
}

export function updateTask(db: QueryExecutor) {
  return async (task: Task): Promise<Task | undefined> => {
    const [result] = await db
      .update(tasks)
      .set({
        title: task.title,
        activityId: task.activityId ?? null,
        activityKindId: task.activityKindId ?? null,
        quantity: task.quantity ?? null,
        startDate: task.startDate,
        dueDate: task.dueDate,
        doneDate: task.doneDate,
        memo: task.memo,
        archivedAt: task.archivedAt,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();
    if (!result) return undefined;
    return createTaskEntity({ ...result, type: "persisted" });
  };
}

export function deleteTask(db: QueryExecutor) {
  return async (task: Task): Promise<void> => {
    const [result] = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();
    if (!result) {
      throw new ResourceNotFoundError("task not found");
    }
  };
}

export function archiveTask(db: QueryExecutor) {
  return async (userId: UserId, taskId: TaskId): Promise<Task | undefined> => {
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    });
    if (!task) return undefined;
    if (!task.doneDate) {
      throw new DomainValidateError(
        "archiveTask: task must be completed before archiving",
      );
    }
    const [result] = await db
      .update(tasks)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      )
      .returning();
    if (!result) return undefined;
    if (!result.doneDate || !result.archivedAt) {
      throw new DomainValidateError(
        "archiveTask: result must have doneDate and archivedAt",
      );
    }
    return createTaskEntity({
      ...result,
      type: "archived",
      doneDate: result.doneDate,
      archivedAt: result.archivedAt,
    });
  };
}

export function hardDeleteTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId): Promise<number> => {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.userId, userId))
      .returning();
    return result.length;
  };
}
