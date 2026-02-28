import { Hono } from "hono";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { SyncActivitiesRequestSchema } from "@packages/types-v2";

import { newActivityV2Handler } from "./activityV2Handler";
import { newActivityV2Repository } from "./activityV2Repository";
import { newActivityV2Usecase } from "./activityV2Usecase";

export function createActivityV2Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivityV2Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newActivityV2Repository(db);
    const uc = newActivityV2Usecase(repo, tracer);
    const h = newActivityV2Handler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/activities", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.getActivities(userId);
      return c.json(res);
    })
    .post("/activities/sync", async (c) => {
      const body = await c.req.json();
      const parsed = SyncActivitiesRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { message: "Invalid request", errors: parsed.error.issues },
          400,
        );
      }
      const { activities: activityList, activityKinds: kindList } =
        parsed.data;
      const userId = c.get("userId");
      const res = await c.var.h.syncActivities(userId, activityList, kindList);
      return c.json(res);
    });
}

export const activityV2Route = createActivityV2Route();
