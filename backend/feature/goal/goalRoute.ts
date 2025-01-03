import { Hono } from "hono";

// import { zValidator } from "@hono/zod-validator";

import { type DrizzleInstance, drizzle } from "@/backend/infra/drizzle";
// import { createGoalRequestSchema } from "@/types/request";

import { authMiddleware } from "../../middleware/authMiddleware";

import { newGoalHandler } from "./goalHandler";
import { newGoalRepository } from "./goalRepository";
import { newGoalUsecase } from "./goalUsecase";

import type { AppContext } from "../../context";

export function createGoalRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newGoalRepository(db);
  const uc = newGoalUsecase(repo);
  const h = newGoalHandler(uc);

  console.log(h);

  return app.get("/", authMiddleware, async (c) => {
    //    const res = await h.getGoals(c.get("userId"), c.req.query());
    const res = { message: "getGoals" };

    return c.json(res);
  });
}

export const goalRoute = createGoalRoute(drizzle);
