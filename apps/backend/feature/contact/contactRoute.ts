import { Hono } from "hono";

import { noopTracer } from "@backend/lib/tracer";
import { optionalAuthMiddleware } from "@backend/middleware/optionalAuthMiddleware";
import {
  contactRateLimitConfig,
  createRateLimitMiddleware,
} from "@backend/middleware/rateLimitMiddleware";
import { zValidator } from "@hono/zod-validator";
import { contactRequestSchema } from "@packages/types/request";

import type { AppContext } from "../../context";
import { newContactHandler } from "./contactHandler";
import { newContactRepository } from "./contactRepository";
import { newContactUsecase } from "./contactUsecase";

export function createContactRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newContactHandler>;
      };
    }
  >();

  app.use("*", optionalAuthMiddleware);

  app.use("*", async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) return next();
    return createRateLimitMiddleware(
      kv,
      contactRateLimitConfig,
      c.get("tracer"),
    )(c, next);
  });

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newContactRepository(db);
    const uc = newContactUsecase(repo, tracer);
    const h = newContactHandler(uc);
    c.set("h", h);
    return next();
  });

  return app.post("/", zValidator("json", contactRequestSchema), async (c) => {
    const userId = c.get("userId");
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "anonymous";
    const params = c.req.valid("json");

    await c.var.h.createContact(params, ip, userId);

    return c.json({ message: "ok" }, 201);
  });
}

export const contactRoute = createContactRoute();
