import { Hono } from "hono";


import { createActivityId } from "@backend/domain";
import { newDrizzleTransactionRunner } from "@backend/infra/drizzle";
import {
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@dtos/request";
import { zValidator } from "@hono/zod-validator";

import { newActivityHandler } from "./activityHandler";
import { newActivityRepository } from "./activityRepository";
import { newActivityUsecase } from "./activityUsecase";

import type { AppContext } from "../../context";
import type { TransactionRunner } from "@backend/infra/db";

export function createActivityRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newActivityRepository>;
        tx: TransactionRunner;
        uc: ReturnType<typeof newActivityUsecase>;
        h: ReturnType<typeof newActivityHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const repo = newActivityRepository(db);
    const tx = newDrizzleTransactionRunner(db);
    const uc = newActivityUsecase(repo, tx);
    const h = newActivityHandler(uc);

    c.set("repo", repo);
    c.set("tx", tx);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");

      const res = await c.var.h.getActivities(userId);
      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await c.var.h.getActivity(userId, activityId);
      return c.json(res);
    })
    .post("/", zValidator("json", CreateActivityRequestSchema), async (c) => {
      const userId = c.get("userId");
      const params = c.req.valid("json");

      const res = await c.var.h.createActivity(userId, params);
      return c.json(res);
    })
    .put("/:id", zValidator("json", UpdateActivityRequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await c.var.h.updateActivity(
        userId,
        activityId,
        c.req.valid("json"),
      );
      return c.json(res);
    })
    .put(
      "/:id/order",
      zValidator("json", UpdateActivityOrderRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const activityId = createActivityId(id);

        const res = await c.var.h.updateActivityOrder(
          userId,
          activityId,
          c.req.valid("json"),
        );
        return c.json(res);
      },
    )
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await c.var.h.deleteActivity(userId, activityId);
      return c.json(res);
    });
}

export const newActivityRoute = createActivityRoute();
