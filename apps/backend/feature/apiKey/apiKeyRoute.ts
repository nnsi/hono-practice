import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { noopTracer } from "@backend/lib/tracer";
import { mockPremiumMiddleware } from "@backend/middleware/mockPremiumMiddleware";
import { premiumMiddleware } from "@backend/middleware/premiumMiddleware";
import { CreateApiKeyRequestSchema } from "@dtos/request";
import { zValidator } from "@hono/zod-validator";

import { newApiKeyHandler } from "./apiKeyHandler";
import { newApiKeyRepository } from "./apiKeyRepository";
import { newApiKeyUsecase } from "./apiKeyUsecase";

export function createApiKeyRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newApiKeyHandler>;
      };
    }
  >();

  // プレミアムミドルウェアを適用（環境に応じて切り替え）
  app.use("*", async (c, next) => {
    if (c.env.NODE_ENV === "test") {
      return mockPremiumMiddleware(c as any, next);
    }
    return premiumMiddleware(c as any, next);
  });

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newApiKeyRepository(db);
    const uc = newApiKeyUsecase(repo, tracer);
    const h = newApiKeyHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.getApiKeys(userId);
      return c.json(res);
    })
    .post("/", zValidator("json", CreateApiKeyRequestSchema), async (c) => {
      const userId = c.get("userId");
      const params = c.req.valid("json");

      const res = await c.var.h.createApiKey(userId, params);

      return c.json(res);
    })
    .delete("/:id", async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.param();

      await c.var.h.deleteApiKey(userId, id);

      return c.json({ success: true });
    });
}

export const apiKeyRoute = createApiKeyRoute();
