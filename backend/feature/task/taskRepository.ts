import { eq, and, desc, isNull } from "drizzle-orm";

import { Task } from "@/backend/domain";
import { AppError, ResourceNotFoundError } from "@/backend/error";
import { type DrizzleInstance } from "@/backend/infra/drizzle/drizzleInstance";
import { tasks } from "@/drizzle/schema";

export type TaskRepository = {
  getTaskAll: (userId: string) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: string,
    taskId: string
  ) => Promise<Task | undefined>;
  getDoneTasksByUserId: (userId: string) => Promise<Task[]>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
};

export function newTaskRepository(db: DrizzleInstance): TaskRepository {
  return {
    getTaskAll: getTaskAll(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    getDoneTasksByUserId: getDoneTasksByUserId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
  };
}

function getTaskAll(db: DrizzleInstance) {
  return async function (userId: string): Promise<Task[]> {
    const result = await db
      .query
      .tasks
      .findMany({
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

function getTaskByUserIdAndTaskId(db: DrizzleInstance) {
  return async function (
    userId: string,
    taskId: string
  ): Promise<Task | undefined> {
    const result = await db
      .query
      .tasks
      .findFirst({
        where:
          and(
            eq(tasks.id, taskId),
            eq(tasks.userId, userId),
            isNull(tasks.deletedAt)
          ),
        })

    if (!result) {
      return undefined;
    }

    return Task.create(result);
  };
}

function createTask(db: DrizzleInstance) {
  return async function (task: Task): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();

    return Task.create({
      ...task,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    });
  };
}

function updateTask(db: DrizzleInstance) {
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

function deleteTask(db: DrizzleInstance) {
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

function getDoneTasksByUserId(db: DrizzleInstance) {
  return async function (userId: string): Promise<Task[]> {
    const result = await db
      .query
      .tasks
      .findMany({
        where: and(eq(tasks.userId, userId), eq(tasks.done, true), isNull(tasks.deletedAt)),
        orderBy: desc(tasks.createdAt),
      });

    return result.map((r) => Task.create(r));
  };
}
