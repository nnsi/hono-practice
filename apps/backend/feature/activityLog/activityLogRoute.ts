import { Hono } from "hono";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { newActivityQueryService } from "@backend/query";
import { zValidator } from "@hono/zod-validator";

import {
  CreateActivityLogBatchRequestSchema,
  CreateActivityLogRequestSchema,
  UpdateActivityLogRequestSchema,
} from "@dtos/request";
import type { GetActivityLogResponse } from "@dtos/response";

import { newActivityRepository } from "../activity";

import { newActivityLogHandler } from "./activityLogHandler";
import { newActivityLogRepository } from "./activityLogRepository";
import { newActivityLogUsecase } from "./activityLogUsecase";

import type { AppContext } from "@backend/context";

// ローカル環境で画像URLをBase64に変換する関数
async function convertActivityIconUrlsToBase64(
  log: GetActivityLogResponse,
  env: AppContext["Bindings"],
): Promise<GetActivityLogResponse> {
  if (env.NODE_ENV !== "development") {
    return log;
  }

  const convertUrl = async (
    url: string | null | undefined,
  ): Promise<string | null | undefined> => {
    if (!url || !url.includes("/public/uploads/")) {
      return url;
    }

    try {
      // URLからファイルパスを抽出
      const match = url.match(/\/public\/uploads\/(.*)/);
      if (!match || !match[1]) return url;

      const filePath = join(process.cwd(), "public", "uploads", match[1]);
      const data = await readFile(filePath);

      // MIMEタイプを推測
      let contentType = "application/octet-stream";
      if (url.endsWith(".webp")) contentType = "image/webp";
      else if (url.endsWith(".jpg") || url.endsWith(".jpeg"))
        contentType = "image/jpeg";
      else if (url.endsWith(".png")) contentType = "image/png";
      else if (url.endsWith(".gif")) contentType = "image/gif";

      return `data:${contentType};base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Failed to convert image URL to base64:", error);
      return url;
    }
  };

  return {
    ...log,
    activity: {
      ...log.activity,
      iconUrl: await convertUrl(log.activity.iconUrl),
      iconThumbnailUrl: await convertUrl(log.activity.iconThumbnailUrl),
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

    const repo = newActivityLogRepository(db);
    const acRepo = newActivityRepository(db);
    const qs = newActivityQueryService(db);
    const uc = newActivityLogUsecase(repo, acRepo, qs, db);
    const h = newActivityLogHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const res = await c.var.h.getActivityLogs(c.get("userId"), c.req.query());

      // ローカル環境では画像URLをBase64に変換
      const convertedLogs = await Promise.all(
        res.map((log) => convertActivityIconUrlsToBase64(log, c.env)),
      );

      return c.json(convertedLogs);
    })
    .get("/stats", async (c) => {
      const res = await c.var.h.getStats(c.get("userId"), c.req.query());

      return c.json(res);
    })
    .get("/:id", async (c) => {
      const { id } = c.req.param();

      const res = await c.var.h.getActivityLog(c.get("userId"), id);

      // ローカル環境では画像URLをBase64に変換
      const convertedLog = await convertActivityIconUrlsToBase64(res, c.env);

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
