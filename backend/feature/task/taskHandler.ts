import { HonoContext } from "@/backend/context";
import { CreateTaskRequest, UpdateTaskRequest } from "@/types/request";
import {
  GetTaskResponseSchema,
  GetTasksResponseSchema,
} from "@/types/response";

import { AppError } from "../../error";

import { TaskUsecase } from ".";

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
  return async (c: HonoContext) => {
    const tasks = await uc.getTasks(c.get("userId"));

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id.value,
      userId: task.userId,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(responseTasks);
    if (!parsedTasks.success) {
      throw new AppError("failed to parse tasks", 500);
    }

    return c.json(parsedTasks.data);
  };
}

function getTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const { id } = c.req.param();

    const task = await uc.getTask(c.get("userId"), id);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data);
  };
}

function createTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const json = await c.req.json<CreateTaskRequest>();

    const task = await uc.createTask(c.get("userId"), json);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data);
  };
}

function updateTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const taskId = c.req.param("id");
    const json = await c.req.json<UpdateTaskRequest>();

    const task = await uc.updateTask(c.get("userId"), taskId, json);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(responseTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data);
  };
}

function deleteTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    await uc.deleteTask(c.get("jwtPayload").id, c.req.param("id"));

    return c.json({});
  };
}
