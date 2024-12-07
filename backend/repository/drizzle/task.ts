import { eq, desc } from "drizzle-orm";

import { drizzle } from "@/backend/lib/drizzle";
import { tasks } from "@/drizzle/schema";
import {
  CreateTaskRequest,
  createTaskRequestSchema,
} from "@/types/request/CreateTaskRequest";
import {
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request/UpdateTaskRequest";
import {
  GetTaskResponse,
  GetTaskResponseSchema,
  GetTasksResponse,
  GetTasksResponseSchema,
} from "@/types/response/GetTasksResponse";

export const getTasks = async (userId: string) => {
  const result: GetTasksResponse = await drizzle
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

export const getTask = async (id: string): Promise<GetTaskResponse> => {
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
    .where(eq(tasks.id, id))
    .execute();
  return result[0];
};
