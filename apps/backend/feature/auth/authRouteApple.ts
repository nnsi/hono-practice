import { Hono } from "hono";

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
  return new Hono<AuthRouteContext>().post(
    "/",
    zValidator("json", appleLoginRequestSchema),
    async (c) => {
      const body = c.req.valid("json");
      const clientIds = collectAppleClientIds(c.env);
      const { user, token, refreshToken } = await c.var.h.appleLoginWithUser(
        body,
        clientIds,
      );
      setRefreshCookie(c, refreshToken);
      return c.json({ user, token, refreshToken });
    },
  );
}
