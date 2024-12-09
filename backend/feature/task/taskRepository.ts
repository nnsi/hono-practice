import { eq, and, desc } from "drizzle-orm";

import { Task } from "@/backend/domain/model/task";
import { DBClient } from "@/backend/lib/drizzle";
import { tasks } from "@/drizzle/schema";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";

export type TaskRepository = {
  getTasks: (userId: string) => Promise<Task[]>;
  getTask: (userId: string, taskId: string) => Promise<Task | undefined>;
  createTask: (userId: string, params: CreateTaskRequest) => Promise<Task>;
  updateTask: (
    userId: string,
    taskId: string,
    params: UpdateTaskRequest
  ) => Promise<Task | undefined>;
  deleteTask: (userId: string, taskId: string) => Promise<Task | undefined>;
  bulkDeleteDoneTask: (userId: string) => Promise<void>;
};

// NOTE: NodePgDatabaseは具体的すぎるが、ORMを利用しているので許容する
export function newTaskRepository(db: DBClient): TaskRepository {
  return {
    getTasks:getTasks(db),
    getTask:getTask(db),
    createTask:createTask(db),
    updateTask:updateTask(db),
    deleteTask:deleteTask(db),
    bulkDeleteDoneTask:bulkDeleteDoneTask(db),
  };
}

function getTasks(db: DBClient) {
  return async function(userId: string) {
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
  }
}

function getTask(db: DBClient) {
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
  }
}

function createTask(db: DBClient) {
  return async function createTask(userId: string, params: CreateTaskRequest) {
    const result = await db
      .insert(tasks)
      .values({
        userId,
        title: params.title,
      })
      .returning();
    return result[0];
  }
}

function updateTask(db: DBClient) {
  return async function updateTask(
    userId: string,
    taskId: string,
    params: UpdateTaskRequest
  ) {
    const result = await db
      .update(tasks)
      .set(params)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
}

function deleteTask(db: DBClient) {
  return async function deleteTask(userId: string, taskId: string) {
    const result = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
}

function bulkDeleteDoneTask(db: DBClient) {
  return async function bulkDeleteDoneTask(userId: string) {
    await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.userId, userId), eq(tasks.done, true)))
      .execute();
  }
}
