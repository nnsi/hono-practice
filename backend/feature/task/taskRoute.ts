import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import {
  createTaskRequestSchema,
  updateTaskRequestSchema,
} from "@/types/request";

import { AppContext } from "../../context";

import { newTaskHandler, newTaskUsecase, newTaskRepository } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const repo = newTaskRepository(drizzle);
const uc = newTaskUsecase(repo);
const h = newTaskHandler(uc);

export const taskRoute = app
  .get("/", ...factory.createHandlers(h.getTasks))
  .get("/:id", ...factory.createHandlers(h.getTask))
  .post(
    "/",
    ...factory.createHandlers(
      zValidator("json", createTaskRequestSchema),
      (c) => h.createTask(c)
    )
  )
  .put(
    "/:id",
    ...factory.createHandlers(
      zValidator("json", updateTaskRequestSchema),
      (c) => h.updateTask(c)
    )
  )
  .delete("/:id", ...factory.createHandlers(h.deleteTask));
