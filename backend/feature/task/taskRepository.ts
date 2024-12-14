import { eq, and, desc, isNull } from "drizzle-orm";

import { Task, TaskId, UserId } from "@/backend/domain";
import { ResourceNotFoundError } from "@/backend/error";
import { type DrizzleClient } from "@/backend/lib/drizzle";
import { tasks } from "@/drizzle/schema";

export type TaskRepository = {
  getTaskAll: (userId: string) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: string,
    taskId: string
  ) => Promise<Task | undefined>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
};

export function newTaskRepository(db: DrizzleClient): TaskRepository {
  return {
    getTaskAll: getTaskAll(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
  };
}

function getTaskAll(db: DrizzleClient) {
  return async function (userId: string): Promise<Task[]> {
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
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt))
      .execute();

    return result.map((r) => ({
      id: TaskId.create(r.id),
      userId: UserId.create(r.userId),
      title: r.title,
      done: r.done,
      memo: r.memo,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  };
}

function getTaskByUserIdAndTaskId(db: DrizzleClient) {
  return async function (
    userId: string,
    taskId: string
  ): Promise<Task | undefined> {
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
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, taskId),
          isNull(tasks.deletedAt)
        )
      )
      .execute();

    if (result.length === 0) {
      return undefined;
    }

    return {
      id: TaskId.create(result[0].id),
      userId: UserId.create(result[0].userId),
      title: result[0].title,
      done: result[0].done,
      memo: result[0].memo,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    };
  };
}

function createTask(db: DrizzleClient) {
  return async function createTask(task: Task): Promise<Task> {
    const setParams = {
      id: task.id.value,
      userId: task.userId.value,
      title: task.title,
      done: task.done,
      memo: task.memo,
    };

    const result = await db.insert(tasks).values(setParams).returning();

    return {
      ...task,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    };
  };
}

function updateTask(db: DrizzleClient) {
  return async function updateTask(task: Task) {
    const result = await db
      .update(tasks)
      .set({
        title: task.title,
        done: task.done,
        memo: task.memo,
      })
      .where(
        and(eq(tasks.id, task.id.value), eq(tasks.userId, task.userId.value))
      )
      .returning();

    if (result.length === 0) {
      return undefined;
    }

    return {
      ...task,
      updatedAt: result[0].updatedAt,
    };
  };
}

function deleteTask(db: DrizzleClient) {
  return async function deleteTask(task: Task) {
    const result = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(tasks.id, task.id.value), eq(tasks.userId, task.userId.value))
      )
      .returning();

    console.log(result);

    if (result.length === 0) {
      throw new ResourceNotFoundError("task not found");
    }
  };
}
