import {
  type Task,
  type TaskId,
  type UserId,
  createTaskEntity,
  createTaskId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";

import type { TaskRepository } from ".";

export type CreateTaskInputParams = {
  title: string;
  startDate?: string;
};

export type UpdateTaskInputParams = {
  title?: string;
  doneDate?: string | null;
  memo?: string | null;
};

export type TaskUsecase = {
  getTasks: (userId: UserId, date?: string) => Promise<Task[]>;
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
  return async (userId: UserId, date?: string) => {
    return await repo.getTasksByUserId(userId, date);
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
    const task = createTaskEntity({
      type: "new",
      id: createTaskId(),
      userId: userId,
      title: params.title,
      startDate: params.startDate,
      doneDate: null,
      memo: null,
    });

    return await repo.createTask(task);
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

    const newTask = createTaskEntity({
      ...task,
      ...params,
    });

    const updateTask = await repo.updateTask(newTask);
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
