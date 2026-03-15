import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncActivityLogsRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newActivityLogSyncHandler } from "./activityLogSyncHandler";
import { newActivityLogSyncRepository } from "./activityLogSyncRepository";
import { newActivityLogSyncUsecase } from "./activityLogSyncUsecase";

export function createActivityLogSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivityLogSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newActivityLogSyncRepository(db);
    const uc = newActivityLogSyncUsecase(repo, tracer);
    const h = newActivityLogSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/activity-logs", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const res = await c.var.h.getActivityLogs(userId, since);
      return c.json(res);
    })
    .post(
      "/activity-logs/sync",
      zValidator("json", SyncActivityLogsRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { logs } = c.req.valid("json");
        const res = await c.var.h.syncActivityLogs(userId, logs);
        return c.json(res);
      },
    );
}

export const activityLogSyncRoute = createActivityLogSyncRoute();
