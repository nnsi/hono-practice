import { Hono } from "hono";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createActivityId } from "@backend/domain";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { createStorageService } from "@backend/infra/storage";
import { syncMiddleware } from "@backend/middleware/syncMiddleware";
import { generateIconKey } from "@backend/utils/imageValidator";
import { zValidator } from "@hono/zod-validator";

import {
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@dtos/request";
import type { GetActivityResponse } from "@dtos/response";

import { newSyncRepository } from "../sync/syncRepository";

import { newActivityHandler } from "./activityHandler";
import { newActivityRepository } from "./activityRepository";
import { newActivityUsecase } from "./activityUsecase";

import type { AppContext } from "../../context";

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
    const repo = newActivityRepository(db);
    const tx = newDrizzleTransactionRunner(db);
    const uc = newActivityUsecase(repo, tx);
    const h = newActivityHandler(uc);

    c.set("h", h);

    // 同期ミドルウェアを適用
    if (c.env.NODE_ENV !== "test") {
      const syncRepo = newSyncRepository(db);
      return syncMiddleware<
        AppContext & {
          Variables: {
            h: ReturnType<typeof newActivityHandler>;
          };
        }
      >(syncRepo)(c, next);
    }

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

      const body = await c.req.json<{ base64: string; mimeType: string }>();
      const { base64, mimeType } = body;

      // Validate mime type
      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
      if (!ALLOWED_TYPES.includes(mimeType)) {
        return c.json({ error: "Invalid image type" }, 400);
      }

      // Get activity to check ownership
      const activity = await c.var.h.getActivity(userId, activityId);
      if (!activity) {
        return c.json({ error: "Activity not found" }, 404);
      }

      // Create storage service
      const storageService = createStorageService(c.env);

      // Generate unique key for image
      const mainKey = generateIconKey(userId, activityId);

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create file from bytes
      const file = new File([bytes], "icon.webp", {
        type: mimeType,
      });

      // Upload image
      const uploaded = await storageService.upload(file, mainKey, {
        contentType: mimeType,
      });

      // Update activity with new icon (use same URL for both since image is already resized)
      const db = c.env.DB;
      const repo = newActivityRepository(db);
      await repo.updateActivityIcon(
        activityId,
        "upload",
        uploaded.url,
        uploaded.url, // Use same URL for thumbnail since it's already resized
      );

      return c.json({
        iconUrl: uploaded.url,
        iconThumbnailUrl: uploaded.url,
      });
    })
    .delete("/:id/icon", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      // Get activity to check ownership and get current icon URLs
      const activity = await c.var.h.getActivity(userId, activityId);
      if (!activity) {
        return c.json({ error: "Activity not found" }, 404);
      }

      // Create storage service
      const storageService = createStorageService(c.env);

      // Delete files from storage if they exist
      if (activity.iconUrl) {
        // Extract key from URL
        const urlParts = activity.iconUrl.split("/");
        const key = urlParts.slice(-4).join("/"); // icons/userId/activityId_timestamp_random.webp or _thumb.webp

        try {
          await storageService.delete(key);
        } catch (error) {
          console.error("Failed to delete main icon:", error);
        }
      }

      if (
        activity.iconThumbnailUrl &&
        activity.iconThumbnailUrl !== activity.iconUrl
      ) {
        // Extract key from URL
        const urlParts = activity.iconThumbnailUrl.split("/");
        const key = urlParts.slice(-4).join("/");

        try {
          await storageService.delete(key);
        } catch (error) {
          console.error("Failed to delete thumbnail icon:", error);
        }
      }

      // Update activity to reset icon to emoji
      const db = c.env.DB;
      const repo = newActivityRepository(db);
      await repo.updateActivityIcon(activityId, "emoji", null, null);

      return c.json({ success: true });
    });
}

export const newActivityRoute = createActivityRoute();
