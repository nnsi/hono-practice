import { eq, and, desc } from "drizzle-orm";

import { Task } from "@/backend/domain/model/task";
import { type DrizzleClient } from "@/backend/lib/drizzle";
import { tasks } from "@/drizzle/schema";

import { TaskCreateParams, TaskUpdateParams } from "./taskValidator";

export type TaskRepository = {
  getTasks: (userId: string) => Promise<Task[]>;
  getTask: (userId: string, taskId: string) => Promise<Task | undefined>;
  createTask: (userId: string, params: TaskCreateParams) => Promise<Task>;
  updateTask: (
    userId: string,
    taskId: string,
    params: TaskUpdateParams
  ) => Promise<Task | undefined>;
  deleteTask: (userId: string, taskId: string) => Promise<Task | undefined>;
  bulkDeleteDoneTask: (userId: string) => Promise<void>;
};

export function newTaskRepository(db: DrizzleClient): TaskRepository {
  return {
    getTasks: getTasks(db),
    getTask: getTask(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    bulkDeleteDoneTask: bulkDeleteDoneTask(db),
  };
}

function getTasks(db: DrizzleClient) {
  return async function (userId: string) {
    const result = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        done: tasks.done,
        memo: tasks.memo,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt))
      .execute();
    return result;
  };
}

function getTask(db: DrizzleClient) {
  return async function (userId: string, taskId: string) {
    const result = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        done: tasks.done,
        memo: tasks.memo,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
      .execute();
    return result.length > 0 ? result[0] : undefined;
  };
}

function createTask(db: DrizzleClient) {
  return async function createTask(userId: string, params: TaskCreateParams) {
    const result = await db
      .insert(tasks)
      .values({
        userId,
        title: params.title,
      })
      .returning();
    return result[0];
  };
}

function updateTask(db: DrizzleClient) {
  return async function updateTask(
    userId: string,
    taskId: string,
    params: TaskUpdateParams
  ) {
    const result = await db
      .update(tasks)
      .set(params)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  };
}

function deleteTask(db: DrizzleClient) {
  return async function deleteTask(userId: string, taskId: string) {
    const result = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  };
}

function bulkDeleteDoneTask(db: DrizzleClient) {
  return async function bulkDeleteDoneTask(userId: string) {
    await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.userId, userId), eq(tasks.done, true)))
      .execute();
  };
}
