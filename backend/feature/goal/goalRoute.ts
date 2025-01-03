import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { type DrizzleInstance, drizzle } from "@/backend/infra/drizzle";
import { CreateGoalRequestSchema } from "@/types/request";
import { UpdateGoalRequestSchema } from "@/types/request/UpdateGoalRequest";

import { newGoalHandler } from "./goalHandler";
import { newGoalRepository } from "./goalRepository";
import { newGoalUsecase } from "./goalUsecase";

import type { AppContext } from "../../context";

export function createGoalRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newGoalRepository(db);
  const uc = newGoalUsecase(repo);
  const h = newGoalHandler(uc);

  return app
    .get("/", async (c) => {
      const res = await h.getGoals(c.get("userId"));

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await h.getGoal(id, c.get("userId"));

      return c.json(res);
    })
    .post("/", zValidator("json", CreateGoalRequestSchema), async (c) => {
      const res = await h.createGoal(c.get("userId"), c.req.valid("json"));

      return c.json(res);
    })
    .put("/:id", zValidator("json", UpdateGoalRequestSchema), async (c) => {
      const { id } = c.req.param();
      const res = await h.updateGoal(id, c.get("userId"), c.req.valid("json"));

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const { id } = c.req.param();
      await h.deleteGoal(id, c.get("userId"));

      return c.body(null, 204);
    });
}

export const goalRoute = createGoalRoute(drizzle);
