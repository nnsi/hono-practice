import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncTasksRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newTaskSyncHandler } from "./taskSyncHandler";
import { newTaskSyncRepository } from "./taskSyncRepository";
import { newTaskSyncUsecase } from "./taskSyncUsecase";

export function createTaskSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newTaskSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newTaskSyncRepository(db);
    const uc = newTaskSyncUsecase(repo, tracer);
    const h = newTaskSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/tasks", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const res = await c.var.h.getTasks(userId, since);
      return c.json(res);
    })
    .post(
      "/tasks/sync",
      zValidator("json", SyncTasksRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { tasks } = c.req.valid("json");
        const res = await c.var.h.syncTasks(userId, tasks);
        return c.json(res);
      },
    );
}

export const taskSyncRoute = createTaskSyncRoute();
