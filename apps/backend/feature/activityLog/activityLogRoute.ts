import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { convertLocalUploadUrlToDataUrl } from "@backend/infra/storage/localUploadDataUrl";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { newActivityQueryService } from "@backend/query";
import { zValidator } from "@hono/zod-validator";
import {
  CreateActivityLogBatchRequestSchema,
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
  getActivityLogStatsRequestSchema,
  getActivityLogsRequestSchema,
} from "@packages/types/request";
import type { GetActivityLogResponse } from "@packages/types/response";

import { newActivityRepository } from "../activity";
import { newActivityLogHandler } from "./activityLogHandler";
import { newActivityLogRepository } from "./activityLogRepository";
import { newActivityLogUsecase } from "./activityLogUsecase";

// ローカル環境で画像URLをBase64に変換する関数
async function convertActivityIconUrlsToBase64(
  log: GetActivityLogResponse,
  env: AppContext["Bindings"],
  logger = noopLogger,
): Promise<GetActivityLogResponse> {
  return {
    ...log,
    activity: {
      ...log.activity,
      iconUrl: await convertLocalUploadUrlToDataUrl(log.activity.iconUrl, {
        isDevelopment: env.NODE_ENV === "development",
        uploadDir: env.UPLOAD_DIR,
        logger,
        warnMessage: "Failed to convert activity log icon URL to base64",
      }),
      iconThumbnailUrl: await convertLocalUploadUrlToDataUrl(
        log.activity.iconThumbnailUrl,
        {
          isDevelopment: env.NODE_ENV === "development",
          uploadDir: env.UPLOAD_DIR,
          logger,
          warnMessage: "Failed to convert activity log icon URL to base64",
        },
      ),
    },
  };
}

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

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newActivityLogRepository(db);
    const acRepo = newActivityRepository(db);
    const qs = newActivityQueryService(db);
    const uc = newActivityLogUsecase(repo, acRepo, qs, db, tracer);
    const h = newActivityLogHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", zValidator("query", getActivityLogsRequestSchema), async (c) => {
      const res = await c.var.h.getActivityLogs(
        c.get("userId"),
        c.req.valid("query"),
      );
      const logger = c.get("logger") ?? noopLogger;

      // ローカル環境では画像URLをBase64に変換
      const convertedLogs = await Promise.all(
        res.map((log) => convertActivityIconUrlsToBase64(log, c.env, logger)),
      );

      return c.json(convertedLogs);
    })
    .get(
      "/stats",
      zValidator("query", getActivityLogStatsRequestSchema),
      async (c) => {
        const res = await c.var.h.getStats(
          c.get("userId"),
          c.req.valid("query"),
        );

        return c.json(res);
      },
    )
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await c.var.h.getActivityLog(c.get("userId"), id);
      const logger = c.get("logger") ?? noopLogger;

      // ローカル環境では画像URLをBase64に変換
      const convertedLog = await convertActivityIconUrlsToBase64(
        res,
        c.env,
        logger,
      );

      return c.json(convertedLog);
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
