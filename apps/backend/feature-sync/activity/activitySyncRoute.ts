import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncActivitiesRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newActivitySyncHandler } from "./activitySyncHandler";
import { newActivitySyncRepository } from "./activitySyncRepository";
import { newActivitySyncUsecase } from "./activitySyncUsecase";

export function createActivitySyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivitySyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newActivitySyncRepository(db);
    const uc = newActivitySyncUsecase(repo, tracer);
    const h = newActivitySyncHandler(uc);

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

export const activitySyncRoute = createActivitySyncRoute();
