import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncGoalsRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newGoalFreezePeriodSyncRepository } from "../goal-freeze-period/goalFreezePeriodSyncRepository";
import { newGoalSyncHandler } from "./goalSyncHandler";
import { newGoalSyncRepository } from "./goalSyncRepository";
import { newGoalSyncUsecase } from "./goalSyncUsecase";

export function createGoalSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newGoalSyncRepository(db);
    const freezeRepo = newGoalFreezePeriodSyncRepository(db);
    const uc = newGoalSyncUsecase(repo, freezeRepo, tracer);
    const h = newGoalSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/goals", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const clientDate = c.req.query("clientDate");
      const res = await c.var.h.getGoals(userId, since, clientDate);
      return c.json(res);
    })
    .post(
      "/goals/sync",
      zValidator("json", SyncGoalsRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { goals } = c.req.valid("json");
        const res = await c.var.h.syncGoals(userId, goals);
        return c.json(res);
      },
    );
}

export const goalSyncRoute = createGoalSyncRoute();
