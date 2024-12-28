import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { AppContext } from "@/backend/context";
import { drizzle } from "@/backend/infra/drizzle";
import { newActivityQueryService } from "@/backend/query";
import { CreateActivityLogRequestSchema } from "@/types/request";

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
  .get("/", (c) => h.getActivityLogs(c))
  .get("/stats", (c) => h.getStats(c))
  .get("/:id", (c) => {
    const { id } = c.req.param();

    return h.getActivityLog(c, id);
  })
  .post("/", zValidator("json", CreateActivityLogRequestSchema), (c) =>
    h.createActivityLog(c)
  )
  .put("/:id", (c) => {
    const { id } = c.req.param();

    return h.updateActivityLog(c, id);
  })
  .delete("/:id", (c) => {
    const { id } = c.req.param();

    return h.deleteActivityLog(c, id);
  });
