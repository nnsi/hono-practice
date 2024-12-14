import { Task, TaskId, UserId } from "@/backend/domain";
import { ResourceNotFoundError } from "@/backend/error";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";

import { TaskRepository } from ".";

export type TaskUsecase = {
  getTasks: (userId: string) => Promise<Task[]>;
  getTask: (userId: string, taskId: string) => Promise<Task>;
  createTask: (userId: string, params: CreateTaskRequest) => Promise<Task>;
  updateTask: (
    userId: string,
    taskId: string,
    params: UpdateTaskRequest
  ) => Promise<Task>;
  deleteTask: (userId: string, taskId: string) => Promise<void>;
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
  return async (userId: string) => {
    return await repo.getTaskAll(userId);
  };
}

function getTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new ResourceNotFoundError("task not found");

    return task;
  };
}

function createTask(repo: TaskRepository) {
  return async (userId: string, params: CreateTaskRequest) => {
    const task: Task = {
      id: TaskId.create(),
      userId: UserId.create(userId),
      title: params.title,
      done: false,
      memo: null,
    };
    return await repo.createTask(task);
  };
}

function updateTask(repo: TaskRepository) {
  return async (userId: string, taskId: string, params: UpdateTaskRequest) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new ResourceNotFoundError("task not found");

    const newTask: Task = { ...task, ...params };

    const updateTask = await repo.updateTask(newTask);
    if (!updateTask) throw new ResourceNotFoundError("task not found");

    return updateTask;
  };
}

function deleteTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new ResourceNotFoundError("task not found");

    await repo.deleteTask(task);

    return;
  };
}
