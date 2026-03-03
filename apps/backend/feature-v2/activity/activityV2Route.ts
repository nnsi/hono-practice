import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncActivitiesRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
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
    .post(
      "/activities/sync",
      zValidator("json", SyncActivitiesRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { activities, activityKinds } = c.req.valid("json");
        const res = await c.var.h.syncActivities(
          userId,
          activities,
          activityKinds,
        );
        return c.json(res);
      },
    );
}

export const activityV2Route = createActivityV2Route();
