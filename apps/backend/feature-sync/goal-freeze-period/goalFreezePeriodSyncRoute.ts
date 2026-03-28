import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncGoalFreezePeriodsRequestSchema } from "@packages/types";
import { z } from "zod";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newGoalFreezePeriodSyncHandler } from "./goalFreezePeriodSyncHandler";
import { newGoalFreezePeriodSyncRepository } from "./goalFreezePeriodSyncRepository";
import { newGoalFreezePeriodSyncUsecase } from "./goalFreezePeriodSyncUsecase";

export function createGoalFreezePeriodSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalFreezePeriodSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newGoalFreezePeriodSyncRepository(db);
    const uc = newGoalFreezePeriodSyncUsecase(repo, tracer);
    const h = newGoalFreezePeriodSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/goal-freeze-periods", async (c) => {
      const userId = c.get("userId");
      const sinceRaw = c.req.query("since");
      const parsed = z
        .string()
        .datetime()
        .optional()
        .safeParse(sinceRaw || undefined);
      if (!parsed.success) {
        return c.json(
          {
            message: "Invalid 'since' parameter. Expected ISO 8601 datetime.",
          },
          400,
        );
      }
      const since = parsed.data;
      const res = await c.var.h.getFreezePeriods(userId, since);
      return c.json(res);
    })
    .post(
      "/goal-freeze-periods/sync",
      zValidator("json", SyncGoalFreezePeriodsRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { freezePeriods } = c.req.valid("json");
        const res = await c.var.h.syncFreezePeriods(userId, freezePeriods);
        return c.json(res);
      },
    );
}

export const goalFreezePeriodSyncRoute = createGoalFreezePeriodSyncRoute();
