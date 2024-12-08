import { eq, and, desc } from "drizzle-orm";

import { drizzle } from "@/backend/lib/drizzle";
import { tasks } from "@/drizzle/schema";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";
import { GetTaskResponse, GetTasksResponse } from "@/types/response";

export type TaskRepository = {
  getTasks: (userId: string) => Promise<GetTasksResponse>;
  getTask: (userId: string, taskId: string) => Promise<GetTaskResponse | null>;
  createTask: (
    userId: string,
    params: CreateTaskRequest
  ) => Promise<GetTaskResponse>;
  updateTask: (
    userId: string,
    taskId: string,
    params: UpdateTaskRequest
  ) => Promise<GetTaskResponse>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  bulkDeleteDoneTask: (userId: string) => Promise<void>;
};

export function newTaskRepository(): TaskRepository {
  return {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    bulkDeleteDoneTask,
  };
}

async function getTasks(userId: string) {
  const result = await drizzle
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

async function getTask(userId: string, taskId: string) {
  const result = await drizzle
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
  return result?.[0] ?? null;
}

async function createTask(userId: string, params: CreateTaskRequest) {
  const result = await drizzle
    .insert(tasks)
    .values({
      userId,
      title: params.title,
    })
    .returning();
  return result[0];
}

async function updateTask(
  userId: string,
  taskId: string,
  params: UpdateTaskRequest
) {
  const result = await drizzle
    .update(tasks)
    .set(params)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return result[0];
}

async function deleteTask(userId: string, taskId: string) {
  await drizzle
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .execute();
}

async function bulkDeleteDoneTask(userId: string) {
  await drizzle
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.done, true)))
    .execute();
}
