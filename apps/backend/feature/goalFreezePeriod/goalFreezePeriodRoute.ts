import { Hono } from "hono";

import { noopTracer } from "@backend/lib/tracer";
import { zValidator } from "@hono/zod-validator";
import {
  CreateFreezePeriodRequestSchema,
  UpdateFreezePeriodRequestSchema,
} from "@packages/types/request";

import type { AppContext } from "../../context";
import { newGoalFreezePeriodHandler } from "./goalFreezePeriodHandler";
import { newGoalFreezePeriodRepository } from "./goalFreezePeriodRepository";
import { newGoalFreezePeriodUsecase } from "./goalFreezePeriodUsecase";

export function createGoalFreezePeriodRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newGoalFreezePeriodHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newGoalFreezePeriodRepository(db);
    const uc = newGoalFreezePeriodUsecase(repo, tracer);
    const h = newGoalFreezePeriodHandler(uc);
    c.set("h", h);
    return next();
  });

  return (
    app
      // フリーズ期間一覧取得
      .get("/:goalId/freeze-periods", async (c) => {
        const userId = c.get("userId");
        const { goalId } = c.req.param();

        const res = await c.var.h.getFreezePeriods(userId, goalId);
        return c.json(res);
      })
      // フリーズ期間作成
      .post(
        "/:goalId/freeze-periods",
        zValidator("json", CreateFreezePeriodRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const { goalId } = c.req.param();
          const params = c.req.valid("json");

          const res = await c.var.h.createFreezePeriod(userId, goalId, params);
          return c.json(res, 201);
        },
      )
      // フリーズ期間更新
      .put(
        "/:goalId/freeze-periods/:id",
        zValidator("json", UpdateFreezePeriodRequestSchema),
        async (c) => {
          const userId = c.get("userId");
          const { goalId, id } = c.req.param();
          const params = c.req.valid("json");

          const res = await c.var.h.updateFreezePeriod(
            userId,
            goalId,
            id,
            params,
          );
          return c.json(res);
        },
      )
      // フリーズ期間削除
      .delete("/:goalId/freeze-periods/:id", async (c) => {
        const userId = c.get("userId");
        const { goalId, id } = c.req.param();

        const res = await c.var.h.deleteFreezePeriod(userId, goalId, id);
        return c.json(res);
      })
  );
}

export const goalFreezePeriodRoute = createGoalFreezePeriodRoute();
