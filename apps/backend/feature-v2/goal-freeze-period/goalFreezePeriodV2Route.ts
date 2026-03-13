import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncGoalFreezePeriodsRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newGoalFreezePeriodV2Handler } from "./goalFreezePeriodV2Handler";
import { newGoalFreezePeriodV2Repository } from "./goalFreezePeriodV2Repository";
import { newGoalFreezePeriodV2Usecase } from "./goalFreezePeriodV2Usecase";

export function createGoalFreezePeriodV2Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalFreezePeriodV2Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newGoalFreezePeriodV2Repository(db);
    const uc = newGoalFreezePeriodV2Usecase(repo, tracer);
    const h = newGoalFreezePeriodV2Handler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/goal-freeze-periods", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
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

export const goalFreezePeriodV2Route = createGoalFreezePeriodV2Route();
