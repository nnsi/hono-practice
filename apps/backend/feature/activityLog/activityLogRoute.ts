import { Hono } from "hono";


import { newActivityQueryService } from "@backend/query";
import { zValidator } from "@hono/zod-validator";

import {
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
} from "@dtos/request";

import { newActivityRepository } from "../activity";

import { newActivityLogHandler } from "./activityLogHandler";
import { newActivityLogRepository } from "./activityLogRepository";
import { newActivityLogUsecase } from "./activityLogUsecase";

import type { AppContext } from "@backend/context";

export function createActivityLogRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newActivityLogRepository>;
        acRepo: ReturnType<typeof newActivityRepository>;
        qs: ReturnType<typeof newActivityQueryService>;
        uc: ReturnType<typeof newActivityLogUsecase>;
        h: ReturnType<typeof newActivityLogHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newActivityLogRepository(db);
    const acRepo = newActivityRepository(db);
    const qs = newActivityQueryService(db);
    const uc = newActivityLogUsecase(repo, acRepo, qs);
    const h = newActivityLogHandler(uc);

    c.set("repo", repo);
    c.set("acRepo", acRepo);
    c.set("qs", qs);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const res = await c.var.h.getActivityLogs(c.get("userId"), c.req.query());

      return c.json(res);
    })
    .get("/stats", async (c) => {
      const res = await c.var.h.getStats(c.get("userId"), c.req.query());

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await c.var.h.getActivityLog(c.get("userId"), id);
      return c.json(res);
    })
    .post(
      "/",
      zValidator("json", CreateActivityLogRequestSchema),
      async (c) => {
        const res = await c.var.h.createActivityLog(
          c.get("userId"),
          c.req.valid("json"),
        );

        return c.json(res);
      },
    )
    .put(
      "/:id",
      zValidator("json", UpdateActivityLogRequestSchema),
      async (c) => {
        const { id } = c.req.param();

        const res = await c.var.h.updateActivityLog(
          c.get("userId"),
          id,
          c.req.valid("json"),
        );

        return c.json(res);
      },
    )
    .delete("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await c.var.h.deleteActivityLog(c.get("userId"), id);

      return c.json(res);
    });
}

export const newActivityLogRoute = createActivityLogRoute();
