import { Hono } from "hono";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";
import { appleLoginRequestSchema } from "@packages/types/request";

import { type AuthRouteContext, setRefreshCookie } from "./authRouteContext";

function collectAppleClientIds(env: {
  APPLE_CLIENT_ID?: string;
  APPLE_BUNDLE_ID?: string;
}): string[] {
  return [env.APPLE_CLIENT_ID, env.APPLE_BUNDLE_ID].filter(
    (id): id is string => !!id,
  );
}

export function createAppleAuthRoutes() {
  return new Hono<AuthRouteContext>()
    .post("/", zValidator("json", appleLoginRequestSchema), async (c) => {
      const body = c.req.valid("json");
      const clientIds = collectAppleClientIds(c.env);
      const { user, token, refreshToken } = await c.var.h.appleLoginWithUser(
        body,
        clientIds,
      );
      setRefreshCookie(c, refreshToken);
      return c.json({ user, token, refreshToken });
    })
    .post(
      "/link",
      authMiddleware,
      zValidator("json", appleLoginRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const body = c.req.valid("json");
        const clientIds = collectAppleClientIds(c.env);
        await c.var.h.linkProvider(userId, "apple", body, clientIds);
        return c.json({ message: "アカウントを紐付けました" });
      },
    );
}
