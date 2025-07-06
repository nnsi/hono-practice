import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { CreateApiKeyRequestSchema } from "@dtos/request";

import { newApiKeyHandler } from "./apiKeyHandler";
import { newApiKeyRepository } from "./apiKeyRepository";
import { newApiKeyUsecase } from "./apiKeyUsecase";

import type { AppContext } from "@backend/context";

export function createApiKeyRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newApiKeyHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newApiKeyRepository(db);
    const uc = newApiKeyUsecase(repo);
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
