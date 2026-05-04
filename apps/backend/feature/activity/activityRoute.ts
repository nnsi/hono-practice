import { Hono } from "hono";

import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { createStorageService } from "@backend/infra/storage";
import { convertLocalUploadUrlToDataUrl } from "@backend/infra/storage/localUploadDataUrl";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { zValidator } from "@hono/zod-validator";
import { createActivityId } from "@packages/domain/activity/activitySchema";
import {
  ActivityIconUploadRequestSchema,
  CreateActivityRequestSchema,
  UpdateActivityOrderRequestSchema,
  UpdateActivityRequestSchema,
} from "@packages/types/request";
import type { GetActivityResponse } from "@packages/types/response";

import type { AppContext } from "../../context";
import { newActivityHandler } from "./activityHandler";
import { newActivityRepository } from "./activityRepository";
import { newActivityUsecase } from "./activityUsecase";

// ローカル環境で画像URLをBase64に変換する関数
async function convertImageUrlsToBase64(
  activity: GetActivityResponse,
  env: AppContext["Bindings"],
  logger = noopLogger,
): Promise<GetActivityResponse> {
  return {
    ...activity,
    iconUrl: await convertLocalUploadUrlToDataUrl(activity.iconUrl, {
      isDevelopment: env.NODE_ENV === "development",
      uploadDir: env.UPLOAD_DIR,
      logger,
      warnMessage: "Failed to convert activity icon URL to base64",
    }),
    iconThumbnailUrl: await convertLocalUploadUrlToDataUrl(
      activity.iconThumbnailUrl,
      {
        isDevelopment: env.NODE_ENV === "development",
        uploadDir: env.UPLOAD_DIR,
        logger,
        warnMessage: "Failed to convert activity icon URL to base64",
      },
    ),
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
    const logger = c.get("logger") ?? noopLogger;
    const repo = newActivityRepository(db);
    const tx = newDrizzleTransactionRunner(db);
    const storage = createStorageService(c.env);
    const uc = newActivityUsecase(repo, tx, tracer, storage, logger);
    const h = newActivityHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");

      const activities = await c.var.h.getActivities(userId);
      const logger = c.get("logger") ?? noopLogger;

      // ローカル環境では画像URLをBase64に変換
      const convertedActivities = await Promise.all(
        activities.map((activity) =>
          convertImageUrlsToBase64(activity, c.env, logger),
        ),
      );

      return c.json(convertedActivities);
    })
    .get("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const activity = await c.var.h.getActivity(userId, activityId);
      const logger = c.get("logger") ?? noopLogger;

      // ローカル環境では画像URLをBase64に変換
      const convertedActivity = await convertImageUrlsToBase64(
        activity,
        c.env,
        logger,
      );

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
    .post(
      "/:id/icon",
      zValidator("json", ActivityIconUploadRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const activityId = createActivityId(id);
        const { base64, mimeType } = c.req.valid("json");

        // Hostヘッダ汚染を防ぐため、必ず env.APP_URL を使う
        const apiBaseUrl = c.env.APP_URL;

        const res = await c.var.h.uploadActivityIcon(
          userId,
          activityId,
          base64,
          mimeType,
          apiBaseUrl,
        );
        return c.json(res);
      },
    )
    .delete("/:id/icon", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();
      const activityId = createActivityId(id);

      const res = await c.var.h.deleteActivityIcon(userId, activityId);
      return c.json(res);
    });
}

export const newActivityRoute = createActivityRoute();
