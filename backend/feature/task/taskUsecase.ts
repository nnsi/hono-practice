import { Task, TaskId, UserId } from "@/backend/domain";
import { AppError } from "@/backend/error";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";

import { TaskRepository } from ".";

export type TaskUsecase = {
  getTasks: (userId: string) => Promise<Task[]>;
  getTask: (userId: string, taskId: string) => Promise<Task | undefined>;
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
    if (!task) throw new AppError("task not found", 404);

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
    if (!task) throw new AppError("task not found", 404);

    task.title = params.title ?? task.title;
    task.done = params.done ?? task.done;
    task.memo = params.memo ?? task.memo;

    const updateTask = await repo.updateTask(task);
    if (!updateTask) throw new AppError("failed to update task", 500);

    return updateTask;
  };
}

function deleteTask(repo: TaskRepository) {
  return async (userId: string, taskId: string) => {
    const task = await repo.getTaskByUserIdAndTaskId(userId, taskId);
    if (!task) throw new AppError("task not found", 404);

    await repo.deleteTask(task);

    return;
  };
}
