import { Hono } from "hono";

import { createTaskId } from "@backend/domain";
import { zValidator } from "@hono/zod-validator";

import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@dtos/request";
import { getTasksRequestSchema } from "@dtos/request/GetTasksRequest";

import { newTaskHandler } from "./taskHandler";
import { newTaskRepository } from "./taskRepository";
import { newTaskUsecase } from "./taskUsecase";

import type { AppContext } from "../../context";

export function createTaskRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newTaskHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newTaskRepository(db);
    const uc = newTaskUsecase(repo as any);
    const h = newTaskHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", zValidator("query", getTasksRequestSchema), async (c) => {
      const id = c.get("userId");
      const { date } = c.req.valid("query");
      const res = await c.var.h.getTasks(id, date);
      return c.json(res);
    })
    .get("/archived", async (c) => {
      const id = c.get("userId");
      const res = await c.var.h.getArchivedTasks(id);
      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);

      const res = await c.var.h.getTask(userId, taskId);

      return c.json(res);
    })
    .post("/", zValidator("json", createTaskRequestSchema), async (c) => {
      const id = c.get("userId");
      const params = c.req.valid("json");

      const res = await c.var.h.createTask(id, params);

      return c.json(res);
    })
    .put("/:id", zValidator("json", updateTaskRequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);
      const params = c.req.valid("json");

      const res = await c.var.h.updateTask(userId, taskId, params);

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);

      const res = await c.var.h.deleteTask(userId, taskId);

      return c.json(res);
    })
    .post("/:id/archive", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);

      const res = await c.var.h.archiveTask(userId, taskId);

      return c.json(res);
    });
}

export const taskRoute = createTaskRoute();
