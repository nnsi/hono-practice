import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { createTaskId } from "@/backend/domain";
import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@/types/request";

import { AppContext } from "../../context";

import { newTaskHandler, newTaskUsecase, newTaskRepository } from ".";

const factory = createFactory<AppContext>();
const app = new Hono<AppContext>();

const repo = newTaskRepository(drizzle);
const uc = newTaskUsecase(repo);
const h = newTaskHandler(uc);

export const taskRoute = app
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
  .put(
    "/:id",
    ...factory.createHandlers(
      zValidator("json", updateTaskRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const taskId = createTaskId(id);
        const params = c.req.valid("json");

        const res = await h.updateTask(userId, taskId, params);

        return c.json(res);
      }
    )
  )
  .delete("/:id", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const taskId = createTaskId(id);

    const res = await h.deleteTask(userId, taskId);

    return c.json(res);
  });
