import { Hono } from "hono";

import type { AppContext } from "../../context";
import { SyncGoalsRequestSchema } from "@packages/types-v2";

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

    const repo = newGoalV2Repository(db);
    const uc = newGoalV2Usecase(repo);
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
    .post("/goals/sync", async (c) => {
      const body = await c.req.json();
      const parsed = SyncGoalsRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { message: "Invalid request", errors: parsed.error.issues },
          400,
        );
      }
      const { goals } = parsed.data;
      const userId = c.get("userId");
      const res = await c.var.h.syncGoals(userId, goals);
      return c.json(res);
    });
}

export const goalV2Route = createGoalV2Route();
