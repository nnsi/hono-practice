import { Hono } from "hono";

import { optionalAuthMiddleware } from "@backend/middleware/optionalAuthMiddleware";
import {
  applyRateLimit,
  clientErrorRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { fireAndForget } from "@backend/utils/fireAndForget";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { AppContext } from "../../context";
import {
  type ClientErrorHandler,
  newClientErrorHandler,
} from "./clientErrorHandler";
import { newClientErrorUsecase } from "./clientErrorUsecase";

const clientErrorSchema = z.object({
  errorType: z.enum([
    "component_error",
    "unhandled_error",
    "network_error",
    "db_query_error",
    "storage_error",
  ]),
  message: z.string().min(1).max(1000),
  stack: z.string().max(5000).optional(),
  // userId はクライアントから受け取らない（サーバ側で auth context から付与）
  screen: z.string().max(200).optional(),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().max(50).optional(),
});

type ClientErrorContext = AppContext & {
  Variables: { h: ClientErrorHandler };
};

export const clientErrorRoute = new Hono<ClientErrorContext>()
  .use("*", optionalAuthMiddleware)
  .use("*", applyRateLimit(clientErrorRateLimitConfig))
  .use("*", async (c, next) => {
    const uc = newClientErrorUsecase(c.env.WAE_CLIENT_ERRORS, c.get("logger"));
    c.set("h", newClientErrorHandler(uc));
    return next();
  })
  .post("/", zValidator("json", clientErrorSchema), async (c) => {
    const body = c.req.valid("json");
    const userId = c.get("userId");
    // 失敗してもレスポンスをブロックしない: バックグラウンド実行
    fireAndForget(c, c.var.h.recordClientError(body, userId), c.get("logger"));
    return c.body(null, 204);
  });
