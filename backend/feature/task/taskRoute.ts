import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { createTaskId } from "@/backend/domain";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@/types/request";

import { newTaskHandler } from "./taskHandler";
import { newTaskRepository } from "./taskRepository";
import { newTaskUsecase } from "./taskUsecase";

import type { AppContext } from "../../context";

export function createTaskRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newTaskRepository>;
        uc: ReturnType<typeof newTaskUsecase>;
        h: ReturnType<typeof newTaskHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newTaskRepository(db);
    const uc = newTaskUsecase(repo);
    const h = newTaskHandler(uc);

    c.set("repo", repo);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const id = c.get("userId");
      const res = await c.var.h.getTasks(id);

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
    });
}

export const taskRoute = createTaskRoute();
