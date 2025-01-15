import { Hono } from "hono";


import { CreateGoalRequestSchema } from "@dtos/request";
import { UpdateGoalRequestSchema } from "@dtos/request/UpdateGoalRequest";
import { zValidator } from "@hono/zod-validator";

import { newGoalHandler } from "./goalHandler";
import { newGoalRepository } from "./goalRepository";
import { newGoalUsecase } from "./goalUsecase";

import type { AppContext } from "../../context";

export function createGoalRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newGoalRepository>;
        uc: ReturnType<typeof newGoalUsecase>;
        h: ReturnType<typeof newGoalHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newGoalRepository(db);
    const uc = newGoalUsecase(repo);
    const h = newGoalHandler(uc);

    c.set("repo", repo);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const res = await c.var.h.getGoals(c.get("userId"));

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await c.var.h.getGoal(id, c.get("userId"));

      return c.json(res);
    })
    .post("/", zValidator("json", CreateGoalRequestSchema), async (c) => {
      const res = await c.var.h.createGoal(
        c.get("userId"),
        c.req.valid("json"),
      );

      return c.json(res);
    })
    .put("/:id", zValidator("json", UpdateGoalRequestSchema), async (c) => {
      const { id } = c.req.param();
      const res = await c.var.h.updateGoal(
        id,
        c.get("userId"),
        c.req.valid("json"),
      );

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const { id } = c.req.param();
      await c.var.h.deleteGoal(id, c.get("userId"));

      return c.body(null, 204);
    });
}

export const goalRoute = createGoalRoute();
