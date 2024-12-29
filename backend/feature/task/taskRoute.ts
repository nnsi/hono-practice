import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { createTaskId } from "@/backend/domain";
import {
  drizzle,
  type DrizzleInstance,
} from "@/backend/infra/drizzle/drizzleInstance";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@/types/request";

import { newTaskHandler } from "./taskHandler";
import { newTaskRepository } from "./taskRepository";
import { newTaskUsecase } from "./taskUsecase";

import type { AppContext } from "../../context";

export function createTaskRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newTaskRepository(db);
  const uc = newTaskUsecase(repo);
  const h = newTaskHandler(uc);

  return app
    .get("/", async (c) => {
      const id = c.get("userId");
      const res = await h.getTasks(id);

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);

      const res = await h.getTask(userId, taskId);

      return c.json(res);
    })
    .post("/", zValidator("json", createTaskRequestSchema), async (c) => {
      const id = c.get("userId");
      const params = c.req.valid("json");
      const res = await h.createTask(id, params);

      return c.json(res);
    })
    .put("/:id", zValidator("json", updateTaskRequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);
      const params = c.req.valid("json");

      const res = await h.updateTask(userId, taskId, params);

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const taskId = createTaskId(id);

      const res = await h.deleteTask(userId, taskId);

      return c.json(res);
    });
}

export const taskRoute = createTaskRoute(drizzle);
