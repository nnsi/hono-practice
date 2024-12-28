import { eq, and, desc, isNull } from "drizzle-orm";

import { Task, TaskId, UserId } from "@/backend/domain";
import { AppError, ResourceNotFoundError } from "@/backend/error";
import { type QueryExecutor } from "@/backend/infra/drizzle";
import { tasks } from "@/drizzle/schema";

export type TaskRepository = {
  getTaskAllByUserId: (userId: UserId) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: UserId,
    taskId: TaskId
  ) => Promise<Task | undefined>;
  getDoneTasksByUserId: (userId: UserId) => Promise<Task[]>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
  withTx: (tx: QueryExecutor) => TaskRepository;
};

export function newTaskRepository(db: QueryExecutor): TaskRepository {
  return {
    getTaskAllByUserId: getTaskAllByUserId(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    getDoneTasksByUserId: getDoneTasksByUserId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    withTx: (tx) => newTaskRepository(tx),
  };
}

function getTaskAllByUserId(db: QueryExecutor) {
  return async function (userId: UserId): Promise<Task[]> {
    const result = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, userId), isNull(tasks.deletedAt)),
      orderBy: desc(tasks.createdAt),
    });

    try {
      return result.map((r) =>
        Task.create({
          id: r.id,
          userId: r.userId,
          title: r.title,
          done: r.done,
          memo: r.memo,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })
      );
    } catch (e) {
      throw new AppError("failed to parse tasks");
    }
  };
}

function getTaskByUserIdAndTaskId(db: QueryExecutor) {
  return async function (
    userId: UserId,
    taskId: TaskId
  ): Promise<Task | undefined> {
    const result = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    });

    if (!result) {
      return undefined;
    }

    return Task.create(result);
  };
}

function createTask(db: QueryExecutor) {
  return async function (task: Task): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();

    return Task.create({
      ...task,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    });
  };
}

function updateTask(db: QueryExecutor) {
  return async function (task: Task) {
    const result = await db
      .update(tasks)
      .set({
        title: task.title,
        done: task.done,
        memo: task.memo,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    return Task.create({
      ...task,
      updatedAt: result[0].updatedAt,
    });
  };
}

function deleteTask(db: QueryExecutor) {
  return async function (task: Task) {
    const result = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, task.userId)))
      .returning();

    if (result.length === 0) {
      throw new ResourceNotFoundError("task not found");
    }
  };
}

function getDoneTasksByUserId(db: QueryExecutor) {
  return async function (userId: UserId): Promise<Task[]> {
    const result = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        eq(tasks.done, true),
        isNull(tasks.deletedAt)
      ),
      orderBy: desc(tasks.createdAt),
    });

    return result.map((r) => Task.create(r));
  };
}
