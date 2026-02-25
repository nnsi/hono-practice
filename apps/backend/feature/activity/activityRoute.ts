import { Hono } from "hono";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createActivityId } from "@packages/domain/activity/activitySchema";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { createStorageService } from "@backend/infra/storage";
import { noopTracer } from "@backend/lib/tracer";
import {
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@dtos/request";
import type { GetActivityResponse } from "@dtos/response";
import { zValidator } from "@hono/zod-validator";

import type { AppContext } from "../../context";
import { newActivityHandler } from "./activityHandler";
import { newActivityRepository } from "./activityRepository";
import { newActivityUsecase } from "./activityUsecase";

// ローカル環境で画像URLをBase64に変換する関数
async function convertImageUrlsToBase64(
  activity: GetActivityResponse,
  env: AppContext["Bindings"],
): Promise<GetActivityResponse> {
  if (env.NODE_ENV !== "development") {
    return activity;
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
    ...activity,
    iconUrl: await convertUrl(activity.iconUrl),
    iconThumbnailUrl: await convertUrl(activity.iconThumbnailUrl),
  };
}

export function createActivityRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newActivityHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newActivityRepository(db);
    const tx = newDrizzleTransactionRunner(db);
    const storage = createStorageService(c.env);
    const uc = newActivityUsecase(repo, tx, tracer, storage);
    const h = newActivityHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");

      const activities = await c.var.h.getActivities(userId);

      // ローカル環境では画像URLをBase64に変換
      const convertedActivities = await Promise.all(
        activities.map((activity) => convertImageUrlsToBase64(activity, c.env)),
      );

      return c.json(convertedActivities);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const activity = await c.var.h.getActivity(userId, activityId);

      // ローカル環境では画像URLをBase64に変換
      const convertedActivity = await convertImageUrlsToBase64(activity, c.env);

      return c.json(convertedActivity);
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
    })
    .post("/:id/icon", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);
      const { base64, mimeType } =
        await c.req.json<{ base64: string; mimeType: string }>();

      const protocol = c.req.header("x-forwarded-proto") || "http";
      const host = c.req.header("host") || "localhost";
      const apiBaseUrl = `${protocol}://${host}`;

      const res = await c.var.h.uploadActivityIcon(
        userId,
        activityId,
        base64,
        mimeType,
        apiBaseUrl,
      );
      return c.json(res);
    })
    .delete("/:id/icon", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await c.var.h.deleteActivityIcon(userId, activityId);
      return c.json(res);
    });
}

export const newActivityRoute = createActivityRoute();
