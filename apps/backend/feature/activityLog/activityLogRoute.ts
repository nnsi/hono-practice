import { Hono } from "hono";

import { syncMiddleware } from "@backend/middleware/syncMiddleware";
import { newActivityQueryService } from "@backend/query";
import { zValidator } from "@hono/zod-validator";

import {
  CreateActivityLogBatchRequestSchema,
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
} from "@dtos/request";

import { newActivityRepository } from "../activity";
import { newSyncRepository } from "../sync/syncRepository";

import { newActivityLogHandler } from "./activityLogHandler";
import { newActivityLogRepository } from "./activityLogRepository";
import { newActivityLogUsecase } from "./activityLogUsecase";

import type { AppContext } from "@backend/context";

export function createActivityLogRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivityLogHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newActivityLogRepository(db);
    const acRepo = newActivityRepository(db);
    const qs = newActivityQueryService(db);
    const uc = newActivityLogUsecase(repo, acRepo, qs, db);
    const h = newActivityLogHandler(uc);

    c.set("h", h);

    // 同期ミドルウェアを適用
    if (c.env.NODE_ENV !== "test") {
      const syncRepo = newSyncRepository(db);
      return syncMiddleware<
        AppContext & {
          Variables: {
            h: ReturnType<typeof newActivityLogHandler>;
          };
        }
      >(syncRepo)(c, next);
    }

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
    .post(
      "/batch",
      zValidator("json", CreateActivityLogBatchRequestSchema),
      async (c) => {
        const res = await c.var.h.createActivityLogBatch(
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
