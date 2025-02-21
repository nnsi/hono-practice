import {
  createTaskId,
  TaskSchema,
  type Task,
  type TaskId,
  type UserId,
} from "@backend/domain";
import { DomainValidateError, ResourceNotFoundError } from "@backend/error";

import type { TaskRepository } from ".";

export type CreateTaskInputParams = {
  title: string;
};

export type UpdateTaskInputParams = {
  title?: string;
  done?: boolean;
  memo?: string | null;
};

export type TaskUsecase = {
  getTasks: (userId: UserId) => Promise<Task[]>;
  getTask: (userId: UserId, taskId: TaskId) => Promise<Task>;
  createTask: (userId: UserId, params: CreateTaskInputParams) => Promise<Task>;
  updateTask: (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => Promise<Task>;
  deleteTask: (userId: UserId, taskId: TaskId) => Promise<void>;
};

export function newTaskUsecase(repo: TaskRepository): TaskUsecase {
  return {
    getTasks: getTasks(repo),
    getTask: getTask(repo),
    createTask: createTask(repo),
    updateTask: updateTask(repo),
    deleteTask: deleteTask(repo),
  };
}

function getTasks(repo: TaskRepository) {
  return async (userId: UserId) => {
    return await repo.getTasksByUserId(userId);
  };
}

function getTask(repo: TaskRepository) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new ResourceNotFoundError("task not found");

    return task;
  };
}

function createTask(repo: TaskRepository) {
  return async (userId: UserId, params: CreateTaskInputParams) => {
    const task = TaskSchema.safeParse({
      type: "new",
      id: createTaskId(),
      userId: userId,
      title: params.title,
      done: false,
      memo: null,
    });
    if (task.error) {
      throw new DomainValidateError("createTaskUsecase: failed to parse task");
    }

    return await repo.createTask(task.data);
  };
}

function updateTask(repo: TaskRepository) {
  return async (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task)
      throw new ResourceNotFoundError("updateTaskUsecase:task not found");

    const newTask = TaskSchema.safeParse({
      ...task,
      ...params,
    });
    if (newTask.error)
      throw new DomainValidateError("updateTaskUsecase: failed to parse task");

    const updateTask = await repo.updateTask(newTask.data);
    if (!updateTask)
      throw new ResourceNotFoundError("updateTaskUsecasetask not found");

    return updateTask;
  };
}

function deleteTask(repo: TaskRepository) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new ResourceNotFoundError("task not found");

    await repo.deleteTask(task);

    return;
  };
}
