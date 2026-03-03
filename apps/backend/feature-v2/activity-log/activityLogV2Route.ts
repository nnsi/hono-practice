import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncActivityLogsRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newActivityLogV2Handler } from "./activityLogV2Handler";
import { newActivityLogV2Repository } from "./activityLogV2Repository";
import { newActivityLogV2Usecase } from "./activityLogV2Usecase";

export function createActivityLogV2Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivityLogV2Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newActivityLogV2Repository(db);
    const uc = newActivityLogV2Usecase(repo, tracer);
    const h = newActivityLogV2Handler(uc);

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

export const activityLogV2Route = createActivityLogV2Route();
