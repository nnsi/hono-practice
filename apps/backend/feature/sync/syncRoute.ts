import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import {
  BatchSyncRequestSchema,
  CheckDuplicatesRequestSchema,
  EnqueueSyncRequestSchema,
  ProcessSyncRequestSchema,
} from "@dtos/request";

import { newActivityRepository } from "../activity/activityRepository";
import { newActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import { newActivityLogRepository } from "../activityLog/activityLogRepository";
import { newTaskRepository } from "../task/taskRepository";

import { newSyncHandler } from "./syncHandler";
import { newSyncRepository } from "./syncRepository";
import { newSyncService } from "./syncService";
import { newSyncUsecase } from "./syncUsecase";

import type { AppContext } from "../../context";

export function createSyncRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newSyncHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const repo = newSyncRepository(db);

    // 各エンティティのリポジトリを作成
    const activityRepo = newActivityRepository(db);
    const activityLogRepo = newActivityLogRepository(db);
    const activityGoalRepo = newActivityGoalRepository(db);
    const taskRepo = newTaskRepository(db);

    // syncServiceを作成
    const syncService = newSyncService(
      db,
      activityRepo,
      activityLogRepo,
      activityGoalRepo,
      taskRepo,
    );

    const uc = newSyncUsecase(repo, syncService, {
      activityRepository: activityRepo,
      activityLogRepository: activityLogRepo,
      taskRepository: taskRepo,
      goalRepository: activityGoalRepo,
    });
    const h = newSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return (
    app
      // 重複チェックエンドポイント
      .post(
        "/check-duplicates",
        zValidator("json", CheckDuplicatesRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const params = c.req.valid("json");

          const result = await c.var.h.checkDuplicates(userId, params);
          return c.json(result);
        },
      )
      // 同期状況取得エンドポイント
      .get("/status", async (c) => {
        const userId = c.get("userId");

        const result = await c.var.h.getSyncStatus(userId);
        return c.json(result);
      })
      // 同期操作のエンキュー
      .post(
        "/enqueue",
        zValidator("json", EnqueueSyncRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const params = c.req.valid("json");

          const result = await c.var.h.enqueueSync(userId, params);
          return c.json(result);
        },
      )
      // 同期キューの処理（管理用）
      .post(
        "/process",
        zValidator("json", ProcessSyncRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const params = c.req.valid("json");

          const result = await c.var.h.processSync(userId, params);
          return c.json(result);
        },
      )
      // バッチ同期エンドポイント
      .post("/batch", zValidator("json", BatchSyncRequestSchema), async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");
        const strategy = c.req.query("strategy") as
          | "client-wins"
          | "server-wins"
          | "timestamp"
          | undefined;

        const result = await c.var.h.batchSync(userId, params, strategy);
        return c.json(result);
      })
      // 同期キューの取得
      .get("/queue", async (c) => {
        const userId = c.get("userId");
        const limit = Number(c.req.query("limit")) || 50;
        const offset = Number(c.req.query("offset")) || 0;

        const result = await c.var.h.getSyncQueue(userId, limit, offset);
        return c.json(result);
      })
      // 同期キューアイテムの削除
      .delete("/queue/:id", async (c) => {
        const userId = c.get("userId");
        const queueId = c.req.param("id");

        await c.var.h.deleteSyncQueueItem(userId, queueId);
        return c.json({ success: true });
      })
      // Pull同期エンドポイント
      .get("/pull", async (c) => {
        const userId = c.get("userId");
        const lastSyncTimestamp = c.req.query("lastSyncTimestamp");
        const entityTypes = c.req.query("entityTypes")?.split(",") as
          | ("activity" | "activityLog" | "task" | "goal")[]
          | undefined;
        const limit = Number(c.req.query("limit")) || 100;
        const cursor = c.req.query("cursor");

        const result = await c.var.h.pullSync(userId, {
          lastSyncTimestamp,
          entityTypes,
          limit,
          cursor,
        });
        return c.json(result);
      })
  );
}

export const newSyncRoute = createSyncRoute();
