import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { AppContext } from "@/backend/context";
import { drizzle } from "@/backend/infra/drizzle";
import { newActivityQueryService } from "@/backend/query";
import {
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
} from "@/types/request";

import { newActivityRepository } from "../activity";

import {
  newActivityLogHandler,
  newActivityLogRepository,
  newActivityLogUsecase,
} from ".";

const app = new Hono<AppContext>();

/*
  endpoint: /activity-logs
  GET /:id : 単一ログ取得
  GET ?date=YYYY-MM-DD : 日付別ログ一覧
  GET ?date=YYYY-MM : 月別ログ一覧
  GET /stats?date=YYYY-MM : 月別統計取得
*/

const repo = newActivityLogRepository(drizzle);
const acRepo = newActivityRepository(drizzle);
const qs = newActivityQueryService(drizzle);
const uc = newActivityLogUsecase(repo, acRepo, qs);
const h = newActivityLogHandler(uc);

export const newActivityLogRoute = app
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
  .post("/", zValidator("json", CreateActivityLogRequestSchema), async (c) => {
    const res = await h.createActivityLog(c.get("userId"), c.req.valid("json"));

    return c.json(res);
  })
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
