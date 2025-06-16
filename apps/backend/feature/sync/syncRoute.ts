import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import {
  CheckDuplicatesRequestSchema,
  EnqueueSyncRequestSchema,
  ProcessSyncRequestSchema,
} from "@dtos/request";

import { newSyncHandler } from "./syncHandler";
import { newSyncRepository } from "./syncRepository";
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
    const uc = newSyncUsecase(repo);
    const h = newSyncHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    // 重複チェックエンドポイント
    .post("/check-duplicates", 
      zValidator("json", CheckDuplicatesRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");

        const result = await c.var.h.checkDuplicates(userId, params);
        return c.json(result);
      }
    )
    // 同期状況取得エンドポイント
    .get("/status", async (c) => {
      const userId = c.get("userId");

      const result = await c.var.h.getSyncStatus(userId);
      return c.json(result);
    })
    // 同期操作のエンキュー
    .post("/enqueue",
      zValidator("json", EnqueueSyncRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");

        const result = await c.var.h.enqueueSync(userId, params);
        return c.json(result);
      }
    )
    // 同期キューの処理（管理用）
    .post("/process",
      zValidator("json", ProcessSyncRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");

        const result = await c.var.h.processSync(userId, params);
        return c.json(result);
      }
    );
}

export const newSyncRoute = createSyncRoute();