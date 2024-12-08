import { AppError } from "@/backend/error";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";
import { GetTaskResponse, GetTasksResponse } from "@/types/response";

import { TaskRepository } from ".";

export type TaskUsecase = {
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

export function newTaskUsecase(repo: TaskRepository): TaskUsecase {
  return {
    getTasks: getTasks(repo),
    getTask: getTask(repo),
    createTask: createTask(repo),
    updateTask: updateTask(repo),
    deleteTask: deleteTask(repo),
    bulkDeleteDoneTask: bulkDeleteDoneTask(repo),
  };
}

function getTasks(repo: TaskRepository) {
  return async (userId: string) => {
    return await repo.getTasks(userId);
  };
}

function getTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    const task = await repo.getTask(userId, taskId);
    if (!task) throw new AppError("task not found", 404);

    return task;
  };
}

function createTask(repo: TaskRepository) {
  return async (userId: string, params: CreateTaskRequest) => {
    return await repo.createTask(userId, params);
  };
}

function updateTask(repo: TaskRepository) {
  return async (userId: string, taskId: string, params: UpdateTaskRequest) => {
    const task = await repo.updateTask(userId, taskId, params);
    if (!task) throw new AppError("task not found", 404);

    return task;
  };
}

function deleteTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    const deletedTask = await repo.deleteTask(userId, taskId);
    if (!deletedTask) throw new AppError("task not found", 404);

    return;
  };
}

function bulkDeleteDoneTask(repo: TaskRepository) {
  return async (userId: string) => {
    return await repo.bulkDeleteDoneTask(userId);
  };
}
