import { Hono } from "hono";

import type { AppContext } from "../../context";
import { SyncActivityLogsRequestSchema } from "@packages/types-v2";

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

    const repo = newActivityLogV2Repository(db);
    const uc = newActivityLogV2Usecase(repo);
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
    .post("/activity-logs/sync", async (c) => {
      const body = await c.req.json();
      const parsed = SyncActivityLogsRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { message: "Invalid request", errors: parsed.error.issues },
          400,
        );
      }
      const { logs } = parsed.data;
      const userId = c.get("userId");
      const res = await c.var.h.syncActivityLogs(userId, logs);
      return c.json(res);
    });
}

export const activityLogV2Route = createActivityLogV2Route();
