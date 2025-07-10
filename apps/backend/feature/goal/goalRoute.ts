import { Hono } from "hono";

import { syncMiddleware } from "@backend/middleware/syncMiddleware";
import { newGoalQueryService } from "@backend/query/goalQueryService";
import { zValidator } from "@hono/zod-validator";

import {
  CreateGoalRequestSchema,
  UpdateGoalRequestSchema,
} from "@dtos/request";

import { newActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import { newActivityGoalService } from "../activitygoal/activityGoalService";
import { newActivityLogRepository } from "../activityLog/activityLogRepository";
import { newSyncRepository } from "../sync/syncRepository";

import { newGoalHandler } from "./goalHandler";
import { newGoalUsecase } from "./goalUsecase";

import type { AppContext } from "../../context";

export function createGoalRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalHandler>;
        goalQueryService: ReturnType<typeof newGoalQueryService>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    // Repository instances
    const activityGoalRepo = newActivityGoalRepository(db);
    const activityLogRepo = newActivityLogRepository(db);

    // Service instances
    const activityGoalService = newActivityGoalService(activityLogRepo);
    const goalQueryService = newGoalQueryService(db);

    // Usecase and Handler
    const uc = newGoalUsecase(activityGoalRepo, activityGoalService);
    const h = newGoalHandler(uc);

    c.set("h", h);
    c.set("goalQueryService", goalQueryService);

    // 同期ミドルウェアを適用
    if (c.env.NODE_ENV !== "test") {
      const syncRepo = newSyncRepository(db);
      return syncMiddleware(syncRepo)(c as any, next);
    }

    return next();
  });

  return (
    app
      // 目標一覧取得
      .get("/", async (c) => {
        const userId = c.get("userId");
        const activityId = c.req.query("activityId");
        const isActive = c.req.query("isActive");

        const filters = {
          ...(activityId && { activityId }),
          ...(isActive && { isActive: isActive === "true" }),
        };

        const res = await c.var.h.getGoals(userId, filters);
        return c.json(res);
      })
      // 個別目標取得
      .get("/:id", async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();

        const res = await c.var.h.getGoal(userId, id);
        return c.json(res);
      })
      // 目標統計情報取得
      .get("/:id/stats", async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();

        try {
          const goalQueryService = c.var.goalQueryService;
          const res = await goalQueryService.getGoalStats(userId, id);
          return c.json(res);
        } catch (error) {
          if (error instanceof Error && error.message === "Goal not found") {
            return c.json({ error: "Goal not found" }, 404);
          }
          throw error;
        }
      })
      // 目標作成
      .post("/", zValidator("json", CreateGoalRequestSchema), async (c) => {
        const userId = c.get("userId");
        const params = c.req.valid("json");

        const res = await c.var.h.createGoal(userId, params);
        return c.json(res, 201);
      })
      // 目標更新
      .put("/:id", zValidator("json", UpdateGoalRequestSchema), async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();
        const params = c.req.valid("json");

        const res = await c.var.h.updateGoal(userId, id, params);
        return c.json(res);
      })
      // 目標削除
      .delete("/:id", async (c) => {
        const userId = c.get("userId");
        const { id } = c.req.param();

        await c.var.h.deleteGoal(userId, id);
        return c.json({ success: true });
      })
  );
}

export const goalRoute = createGoalRoute();
