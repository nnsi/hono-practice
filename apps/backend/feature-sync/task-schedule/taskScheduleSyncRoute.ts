import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncTaskSchedulesRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { parseSince } from "../shared/sinceSchema";
import { newTaskScheduleSyncHandler } from "./taskScheduleSyncHandler";
import { newTaskScheduleSyncRepository } from "./taskScheduleSyncRepository";
import { newTaskScheduleSyncUsecase } from "./taskScheduleSyncUsecase";

export function createTaskScheduleSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newTaskScheduleSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newTaskScheduleSyncRepository(db);
    const uc = newTaskScheduleSyncUsecase(repo, tracer);
    const h = newTaskScheduleSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/task-schedules", async (c) => {
      const userId = c.get("userId");
      const sinceResult = parseSince(c);
      if (!sinceResult.success) {
        return sinceResult.response;
      }
      const res = await c.var.h.getTaskSchedules(userId, sinceResult.since);
      return c.json(res);
    })
    .post(
      "/task-schedules/sync",
      zValidator("json", SyncTaskSchedulesRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { taskSchedules } = c.req.valid("json");
        const res = await c.var.h.syncTaskSchedules(userId, taskSchedules);
        return c.json(res);
      },
    );
}

export const taskScheduleSyncRoute = createTaskScheduleSyncRoute();
