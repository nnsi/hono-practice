import { and, desc, eq, isNull } from "drizzle-orm";

import {
  type Task,
  TaskFactory,
  type TaskId,
  type UserId,
} from "@/backend/domain";
import { ResourceNotFoundError } from "@/backend/error";
import type { QueryExecutor } from "@/backend/infra/drizzle";
import { tasks } from "@/drizzle/schema";

export type TaskRepository = {
  getTaskAllByUserId: (userId: UserId) => Promise<Task[]>;
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
    getTaskAllByUserId: getTaskAllByUserId(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    withTx: (tx) => newTaskRepository(tx),
  };
}

function getTaskAllByUserId(db: QueryExecutor) {
  return async (userId: UserId) => {
    const result = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      orderBy: desc(tasks.createdAt),
    });

    return result.map((r) =>
      TaskFactory.create({
        id: r.id,
        userId: r.userId,
        title: r.title,
        done: r.done,
        memo: r.memo,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
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

    return TaskFactory.create(result);
  };
}

function createTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db.insert(tasks).values(task).returning();

    return TaskFactory.create({
      ...task,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  };
}

function updateTask(db: QueryExecutor) {
  return async (task: Task) => {
    const [result] = await db
      .update(tasks)
      .set({
        title: task.title,
        done: task.done,
        memo: task.memo,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (!result) {
      return undefined;
    }

    return TaskFactory.create({
      ...task,
      updatedAt: result.updatedAt,
    });
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
