import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { createActivityId } from "@/backend/domain";
import {
  drizzle,
  type DrizzleInstance,
  newDrizzleTransactionRunner,
} from "@/backend/infra/drizzle";
import {
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@/types/request";

import { newActivityHandler } from "./activityHandler";
import { newActivityRepository } from "./activityRepository";
import { newActivityUsecase } from "./activityUsecase";

import type { AppContext } from "../../context";

export function createActivityRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newActivityRepository(db);
  const tx = newDrizzleTransactionRunner(db);
  const uc = newActivityUsecase(repo, tx);
  const h = newActivityHandler(uc);

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");

      const res = await h.getActivities(userId);
      return c.json(res);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await h.getActivity(userId, activityId);
      return c.json(res);
    })
    .post("/", zValidator("json", CreateActivityRequestSchema), async (c) => {
      const userId = c.get("userId");
      const params = c.req.valid("json");

      const res = await h.createActivity(userId, params);
      return c.json(res);
    })
    .put("/:id", zValidator("json", UpdateActivityRequestSchema), async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await h.updateActivity(
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

        const res = await h.updateActivityOrder(
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

      const res = await h.deleteActivity(userId, activityId);
      return c.json(res);
    });
}

export const newActivityRoute = createActivityRoute(drizzle);
