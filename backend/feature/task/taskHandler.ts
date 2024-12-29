import type { TaskId, UserId } from "@/backend/domain";
import type { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";
import {
  GetTaskResponseSchema,
  GetTasksResponseSchema,
} from "@/types/response";

import { AppError } from "../../error";

import type { TaskUsecase } from ".";

export function newTaskHandler(uc: TaskUsecase) {
  return {
    getTasks: getTasks(uc),
    getTask: getTask(uc),
    createTask: createTask(uc),
    updateTask: updateTask(uc),
    deleteTask: deleteTask(uc),
  };
}

function getTasks(uc: TaskUsecase) {
  return async (userId: UserId) => {
    const tasks = await uc.getTasks(userId);

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id,
      userId: task.userId,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("failed to parse tasks", 500);
    }

    return parsedTasks.data;
  };
}

function getTask(uc: TaskUsecase) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await uc.getTask(userId, taskId);

    const responseTask = {
      ...task,
      id: task.id,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return parsedTask.data;
  };
}

function createTask(uc: TaskUsecase) {
  return async (userId: UserId, params: CreateTaskRequest) => {
    const task = await uc.createTask(userId, params);

    const responseTask = {
      ...task,
      id: task.id,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return parsedTask.data;
  };
}

function updateTask(uc: TaskUsecase) {
  return async (userId: UserId, taskId: TaskId, params: UpdateTaskRequest) => {
    const task = await uc.updateTask(userId, taskId, params);

    const responseTask = {
      ...task,
      id: task.id,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return parsedTask.data;
  };
}

function deleteTask(uc: TaskUsecase) {
  return async (userId: UserId, taskId: TaskId) => {
    await uc.deleteTask(userId, taskId);

    return { message: "success" };
  };
}
