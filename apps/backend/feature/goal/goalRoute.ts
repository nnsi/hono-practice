import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import {
  CreateDebtGoalRequestSchema,
  CreateMonthlyGoalRequestSchema,
  UpdateDebtGoalRequestSchema,
  UpdateMonthlyGoalRequestSchema,
} from "@dtos/request";

import { newActivityDebtRepository } from "../activitydebt/activityDebtRepository";
import { newActivityDebtService } from "../activitydebt/activityDebtService";
import { newActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import { newActivityGoalService } from "../activitygoal/activityGoalService";
import { newActivityLogRepository } from "../activityLog/activityLogRepository";

import { newGoalHandler } from "./goalHandler";
import { newGoalUsecase } from "./goalUsecase";

import type { AppContext } from "../../context";

export function createGoalRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    // Repository instances
    const activityDebtRepo = newActivityDebtRepository(db);
    const activityGoalRepo = newActivityGoalRepository(db);
    const activityLogRepo = newActivityLogRepository(db);

    // Service instances
    const activityDebtService = newActivityDebtService(activityLogRepo);
    const activityGoalService = newActivityGoalService(activityLogRepo);

    // Usecase and Handler
    const uc = newGoalUsecase(
      activityDebtRepo,
      activityGoalRepo,
      activityDebtService,
      activityGoalService,
    );
    const h = newGoalHandler(uc);

    c.set("h", h);

    return next();
  });

  return (
    app
      // 統合目標一覧取得
      .get("/", async (c) => {
        const userId = c.get("userId");
        const type = c.req.query("type"); // debt | monthly_target
        const activityId = c.req.query("activityId");
        const isActive = c.req.query("isActive");

        const filters = {
          ...(type && { type: type as "debt" | "monthly_target" }),
          ...(activityId && { activityId }),
          ...(isActive && { isActive: isActive === "true" }),
        };

        const res = await c.var.h.getGoals(userId, filters);
        return c.json(res);
      })
      // 個別目標取得
      .get("/:type/:id", async (c) => {
        const userId = c.get("userId");
        const { type, id } = c.req.param();

        if (type !== "debt" && type !== "monthly_target") {
          return c.json({ error: "Invalid goal type" }, 400);
        }

        const res = await c.var.h.getGoal(userId, id, type);
        return c.json(res);
      })
      // 負債目標作成
      .post(
        "/debt",
        zValidator("json", CreateDebtGoalRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const params = c.req.valid("json");

          const res = await c.var.h.createDebtGoal(userId, params);
          return c.json(res, 201);
        },
      )
      // 月間目標作成
      .post(
        "/monthly",
        zValidator("json", CreateMonthlyGoalRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const params = c.req.valid("json");

          const res = await c.var.h.createMonthlyGoal(userId, params);
          return c.json(res, 201);
        },
      )
      // 負債目標更新
      .put(
        "/debt/:id",
        zValidator("json", UpdateDebtGoalRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const { id } = c.req.param();
          const params = c.req.valid("json");

          const res = await c.var.h.updateGoal(userId, id, "debt", params);
          return c.json(res);
        },
      )
      // 月間目標更新
      .put(
        "/monthly_target/:id",
        zValidator("json", UpdateMonthlyGoalRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const { id } = c.req.param();
          const params = c.req.valid("json");

          const res = await c.var.h.updateGoal(
            userId,
            id,
            "monthly_target",
            params,
          );
          return c.json(res);
        },
      )
      // 目標削除
      .delete("/:type/:id", async (c) => {
        const userId = c.get("userId");
        const { type, id } = c.req.param();

        if (type !== "debt" && type !== "monthly_target") {
          return c.json({ error: "Invalid goal type" }, 400);
        }

        await c.var.h.deleteGoal(userId, id, type);
        return c.json({ success: true });
      })
  );
}

export const goalRoute = createGoalRoute();
