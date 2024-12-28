import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { AppContext } from "@/backend/context";
import { drizzle, DrizzleInstance } from "@/backend/infra/drizzle";
import { newActivityQueryService } from "@/backend/query";
import {
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
} from "@/types/request";

import { newActivityRepository } from "../activity";

import { newActivityLogHandler } from "./activityLogHandler";
import { newActivityLogRepository } from "./activityLogRepository";
import { newActivityLogUsecase } from "./activityLogUsecase";

export function createActivityLogRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newActivityLogRepository(db);
  const acRepo = newActivityRepository(db);
  const qs = newActivityQueryService(db);
  const uc = newActivityLogUsecase(repo, acRepo, qs);
  const h = newActivityLogHandler(uc);

  return app
    .get("/", async (c) => {
      const res = await h.getActivityLogs(c.get("userId"), c.req.query());

      return c.json(res);
    })
    .get("/stats", async (c) => {
      const res = await h.getStats(c.get("userId"), c.req.query());

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await h.getActivityLog(c.get("userId"), id);
      return c.json(res);
    })
    .post(
      "/",
      zValidator("json", CreateActivityLogRequestSchema),
      async (c) => {
        const res = await h.createActivityLog(
          c.get("userId"),
          c.req.valid("json")
        );

        return c.json(res);
      }
    )
    .put(
      "/:id",
      zValidator("json", UpdateActivityLogRequestSchema),
      async (c) => {
        const { id } = c.req.param();

        const res = await h.updateActivityLog(
          c.get("userId"),
          id,
          c.req.valid("json")
        );

        return c.json(res);
      }
    )
    .delete("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await h.deleteActivityLog(c.get("userId"), id);

      return c.json(res);
    });
}

export const newActivityLogRoute = createActivityLogRoute(drizzle);
