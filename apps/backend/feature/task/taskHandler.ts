import type { TaskId, UserId } from "@backend/domain";
import type { CreateTaskRequest, UpdateTaskRequest } from "@dtos/request";
import { GetTaskResponseSchema, GetTasksResponseSchema } from "@dtos/response";

import { AppError } from "../../error";
import type { TaskUsecase } from ".";

export function newTaskHandler(uc: TaskUsecase) {
  return {
    getTasks: getTasks(uc),
    getArchivedTasks: getArchivedTasks(uc),
    getTask: getTask(uc),
    createTask: createTask(uc),
    updateTask: updateTask(uc),
    deleteTask: deleteTask(uc),
    archiveTask: archiveTask(uc),
  };
}

function getTasks(uc: TaskUsecase) {
  return async (userId: UserId, date?: string) => {
    const tasks = await uc.getTasks(userId, date);

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id,
      userId: task.userId,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("getTasksHandler: failed to parse tasks", 500);
    }

    return parsedTasks.data;
  };
}

function getArchivedTasks(uc: TaskUsecase) {
  return async (userId: UserId) => {
    const tasks = await uc.getArchivedTasks(userId);

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id,
      userId: task.userId,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("getArchivedTasksHandler: failed to parse tasks", 500);
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
      throw new AppError("getTaskHandler: failed to parse task", 500);
    }

    return parsedTask.data;
  };
}

function createTask(uc: TaskUsecase) {
  return async (userId: UserId, params: CreateTaskRequest) => {
    const task = await uc.createTask(userId, params);

    const parsedTask = GetTaskResponseSchema.safeParse(task);
    if (!parsedTask.success) {
      throw new AppError("createTaskHandler: failed to parse task", 500);
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
      throw new AppError("updateTaskHandler: failed to parse task", 500);
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

function archiveTask(uc: TaskUsecase) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await uc.archiveTask(userId, taskId);

    const responseTask = {
      ...task,
      id: task.id,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("archiveTaskHandler: failed to parse task", 500);
    }

    return parsedTask.data;
  };
}
