import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncGoalsRequestSchema } from "@packages/types";
import { z } from "zod";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newGoalFreezePeriodSyncRepository } from "../goal-freeze-period/goalFreezePeriodSyncRepository";
import { parseSince } from "../shared/sinceSchema";
import { newGoalSyncHandler } from "./goalSyncHandler";
import { newGoalSyncRepository } from "./goalSyncRepository";
import { newGoalSyncUsecase } from "./goalSyncUsecase";

const clientDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .optional();

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
      const sinceResult = parseSince(c);
      if (!sinceResult.success) {
        return sinceResult.response;
      }
      const clientDateParsed = clientDateSchema.safeParse(
        c.req.query("clientDate") || undefined,
      );
      if (!clientDateParsed.success) {
        return c.json(
          { message: "Invalid 'clientDate' parameter. Expected YYYY-MM-DD." },
          400,
        );
      }
      const res = await c.var.h.getGoals(
        userId,
        sinceResult.since,
        clientDateParsed.data,
      );
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
