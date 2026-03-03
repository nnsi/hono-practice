import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";
import { SyncGoalsRequestSchema } from "@packages/types";

import type { AppContext } from "../../context";
import { noopTracer } from "../../lib/tracer";
import { newGoalV2Handler } from "./goalV2Handler";
import { newGoalV2Repository } from "./goalV2Repository";
import { newGoalV2Usecase } from "./goalV2Usecase";

export function createGoalV2Route() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalV2Handler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const repo = newGoalV2Repository(db);
    const uc = newGoalV2Usecase(repo, tracer);
    const h = newGoalV2Handler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/goals", async (c) => {
      const userId = c.get("userId");
      const since = c.req.query("since");
      const res = await c.var.h.getGoals(userId, since);
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

export const goalV2Route = createGoalV2Route();
