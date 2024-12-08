import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";

import { TaskRepository } from "../repository/drizzle/repositories";

import { TaskUsecase } from "./usecases";

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
    return await repo.getTask(userId, taskId);
  };
}

function createTask(repo: TaskRepository) {
  return async (userId: string, params: CreateTaskRequest) => {
    return await repo.createTask(userId, params);
  };
}

function updateTask(repo: TaskRepository) {
  return async (userId: string, taskId: string, params: UpdateTaskRequest) => {
    return await repo.updateTask(userId, taskId, params);
  };
}

function deleteTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    return await repo.deleteTask(userId, taskId);
  };
}

function bulkDeleteDoneTask(repo: TaskRepository) {
  return async (userId: string) => {
    return await repo.bulkDeleteDoneTask(userId);
  };
}
