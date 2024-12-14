import { HonoContext } from "@/backend/context";
import {
  CreateTaskRequest,
  createTaskRequestSchema,
  UpdateTaskRequest,
  updateTaskRequestSchema,
} from "@/types/request";
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

    const resposeneTasks = tasks.map((task) => ({
      ...task,
      id: task.id.value,
      userId: task.userId.value,
    }));

    const parsedTasks = GetTasksResponseSchema.safeParse(resposeneTasks);
    if (!parsedTasks.success) {
      throw new AppError("failed to parse tasks", 500);
    }

    return c.json(parsedTasks.data, 200);
  };
}

function getTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const { id } = c.req.param();
    const userId = c.get("jwtPayload").id;

    const task = await uc.getTask(userId, id);

    if (!task) {
      throw new AppError("task not found", 404);
    }

    const resposeneTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(resposeneTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data, 200);
  };
}

function createTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const json = await c.req.json<CreateTaskRequest>();

    const params = createTaskRequestSchema.safeParse(json);
    if (!params.success) {
      throw new AppError("failed to parse request", 400);
    }

    const task = await uc.createTask(c.get("jwtPayload").id, params.data);

    const resposeneTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(resposeneTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data, 200);
  };
}

function updateTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    const userId = c.get("jwtPayload").id;
    const taskId = c.req.param("id");
    const json = await c.req.json<UpdateTaskRequest>();

    const params = updateTaskRequestSchema.safeParse(json);
    if (!params.success) {
      throw new AppError("failed to parse request", 400);
    }

    const task = await uc.updateTask(userId, taskId, params.data);

    const resposeneTask = {
      ...task,
      id: task.id.value,
      userId: task.userId.value,
    };

    const parsedTask = GetTaskResponseSchema.safeParse(resposeneTask);
    if (!parsedTask.success) {
      throw new AppError("failed to parse task", 500);
    }

    return c.json(parsedTask.data, 200);
  };
}

function deleteTask(uc: TaskUsecase) {
  return async (c: HonoContext) => {
    await uc.deleteTask(c.get("jwtPayload").id, c.req.param("id"));

    return c.json({}, 200);
  };
}
