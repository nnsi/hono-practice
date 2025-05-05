import {
  createTaskEntity,
  type Task,
  type TaskId,
  TaskSchema,
  type UserId,
} from "@backend/domain";
import { DomainValidateError, ResourceNotFoundError } from "@backend/error";
import { tasks } from "@infra/drizzle/schema";
import { and, desc, eq, isNull, or, lte, gte, not } from "drizzle-orm";

import type { QueryExecutor } from "@backend/infra/drizzle";

export type TaskRepository = {
  getTasksByUserId: (userId: UserId, date?: string) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: UserId,
    taskId: TaskId,
  ) => Promise<Task | undefined>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
  withTx: (tx: QueryExecutor) => TaskRepository;
};

export function newTaskRepository(db: QueryExecutor): TaskRepository {
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
            // doneAtがnullでない場合
            not(isNull(tasks.doneAt)),
            eq(tasks.doneAt, date),
          ),
          // 未完了: 期間内 or 期間指定なし
          and(
            isNull(tasks.doneAt),
            or(
              // startDate/dueDateがnullなら全日表示
              isNull(tasks.startDate),
              isNull(tasks.dueDate),
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
    if (persistedTask.error) {
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
        doneAt: task.doneAt,
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
