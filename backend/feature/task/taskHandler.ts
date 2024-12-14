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
    const userId = c.get("jwtPayload").id;
    const tasks = await uc.getTasks(userId);

    const responseTasks = tasks.map((task) => ({
      ...task,
      id: task.id.value,
      userId: task.userId.value,
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
    const userId = c.get("jwtPayload").id;

    const task = await uc.getTask(userId, id);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
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

    const task = await uc.createTask(c.get("jwtPayload").id, json);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
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
    const userId = c.get("jwtPayload").id;
    const taskId = c.req.param("id");
    const json = await c.req.json<UpdateTaskRequest>();

    const task = await uc.updateTask(userId, taskId, json);

    const responseTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
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
