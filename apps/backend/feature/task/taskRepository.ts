import {
  type Task,
  type TaskId,
  TaskSchema,
  type UserId,
  createTaskEntity,
} from "@backend/domain";
import { DomainValidateError, ResourceNotFoundError } from "@backend/error";
import { tasks } from "@infra/drizzle/schema";
import { and, desc, eq, gte, isNull, lte, not, or } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle";

export type TaskRepository<T = unknown> = {
  getTasksByUserId: (userId: UserId, date?: string) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: UserId,
    taskId: TaskId,
  ) => Promise<Task | undefined>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
  withTx: (tx: T) => TaskRepository<T>;
};

export function newTaskRepository(
  db: QueryExecutor,
): TaskRepository<QueryExecutor> {
  return {
    getTasksByUserId: getTasksByUserId(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    withTx: (tx) => newTaskRepository(tx),
  };
}

function getTasksByUserId(db: QueryExecutor) {
  return async (userId: UserId, date?: string) => {
    let whereClause: any;
    if (date) {
      whereClause = and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        // 完了済み: 完了日と一致
        or(
          and(
            // doneDateがnullでない場合
            not(isNull(tasks.doneDate)),
            eq(tasks.doneDate, date),
          ),
          // 未完了: 期間内 or 期間指定なし
          and(
            isNull(tasks.doneDate),
            or(
              // startDate/dueDateがnullなら全日表示
              and(isNull(tasks.startDate), isNull(tasks.dueDate)),
              // startDateのみnull
              and(isNull(tasks.startDate), gte(tasks.dueDate, date)),
              // dueDateのみnull
              and(lte(tasks.startDate, date), isNull(tasks.dueDate)),
              // 両方設定あり
              and(lte(tasks.startDate, date), gte(tasks.dueDate, date)),
            ),
          ),
        ),
      );
    } else {
      whereClause = and(eq(tasks.userId, userId), isNull(tasks.deletedAt));
    }
    const result = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: desc(tasks.createdAt),
    });

    return result.map((r) => {
      const task = createTaskEntity({ ...r, type: "persisted" });
      return task;
    });
  };
}

function getTaskByUserIdAndTaskId(db: QueryExecutor) {
  return async (userId: UserId, taskId: TaskId) => {
    const result = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    });

    if (!result) {
      return undefined;
    }

    const task = createTaskEntity({ ...result, type: "persisted" });

    return task;
  };
}

function createTask(db: QueryExecutor) {
  return async (task: Task) => {
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

function updateTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db
      .update(tasks)
      .set({
        title: task.title,
        doneDate: task.doneDate,
        memo: task.memo,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    const updateTask = createTaskEntity({ ...result, type: "persisted" });

    return updateTask;
  };
}

function deleteTask(db: QueryExecutor) {
  return async (task: Task) => {
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
