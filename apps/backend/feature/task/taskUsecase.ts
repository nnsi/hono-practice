import {
  type Task,
  type TaskId,
  type UserId,
  createTaskEntity,
  createTaskId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";

import type { TaskRepository } from ".";

export type CreateTaskInputParams = {
  title: string;
  startDate?: string;
  dueDate?: string;
  memo?: string;
};

export type UpdateTaskInputParams = {
  title?: string;
  doneDate?: string | null;
  memo?: string | null;
  startDate?: string;
  dueDate?: string | null;
};

export type TaskUsecase = {
  getTasks: (userId: UserId, date?: string) => Promise<Task[]>;
  getArchivedTasks: (userId: UserId) => Promise<Task[]>;
  getTask: (userId: UserId, taskId: TaskId) => Promise<Task>;
  createTask: (userId: UserId, params: CreateTaskInputParams) => Promise<Task>;
  updateTask: (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => Promise<Task>;
  deleteTask: (userId: UserId, taskId: TaskId) => Promise<void>;
  archiveTask: (userId: UserId, taskId: TaskId) => Promise<Task>;
};

export function newTaskUsecase(
  repo: TaskRepository,
  tracer: Tracer,
): TaskUsecase {
  return {
    getTasks: getTasks(repo, tracer),
    getArchivedTasks: getArchivedTasks(repo, tracer),
    getTask: getTask(repo, tracer),
    createTask: createTask(repo, tracer),
    updateTask: updateTask(repo, tracer),
    deleteTask: deleteTask(repo, tracer),
    archiveTask: archiveTask(repo, tracer),
  };
}

function getTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, date?: string) => {
    return await tracer.span("db.getTasksByUserId", () =>
      repo.getTasksByUserId(userId, date),
    );
  };
}

function getArchivedTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    return await tracer.span("db.getArchivedTasksByUserId", () =>
      repo.getArchivedTasksByUserId(userId),
    );
  };
}

function getTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    return task;
  };
}

function createTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, params: CreateTaskInputParams) => {
    const task = createTaskEntity({
      type: "new",
      id: createTaskId(),
      userId: userId,
      title: params.title,
      startDate: params.startDate || null,
      dueDate: params.dueDate || null,
      doneDate: null,
      memo: params.memo || null,
      archivedAt: null,
    });

    return await tracer.span("db.createTask", () => repo.createTask(task));
  };
}

function updateTask(repo: TaskRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task)
      throw new ResourceNotFoundError("updateTaskUsecase:task not found");

    // アーカイブ済みタスクは getTaskByUserIdAndTaskId では取得されないため、
    // ここに到達する task は必ず "new" か "persisted" タイプ
    if (task.type === "archived") {
      // 実際にはここに到達しないが、型安全性のため
      throw new ResourceNotFoundError("updateTaskUsecase:task not found");
    }

    const newTask = createTaskEntity({
      ...task,
      ...params,
    });

    const updateTask = await tracer.span("db.updateTask", () =>
      repo.updateTask(newTask),
    );
    if (!updateTask)
      throw new ResourceNotFoundError("updateTaskUsecasetask not found");

    return updateTask;
  };
}

function deleteTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    await tracer.span("db.deleteTask", () => repo.deleteTask(task));

    return;
  };
}

function archiveTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const archivedTask = await tracer.span("db.archiveTask", () =>
      repo.archiveTask(userId, taskId),
    );
    if (!archivedTask) throw new ResourceNotFoundError("task not found");

    return archivedTask;
  };
}
