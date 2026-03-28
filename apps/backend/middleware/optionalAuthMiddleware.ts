import type { Next } from "hono";

import { createUserId } from "@packages/domain/user/userSchema";

import type { HonoContext } from "../context";
import { verifyToken } from "./authMiddleware";

export async function optionalAuthMiddleware(c: HonoContext, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    if (jwt) {
      try {
        const { JWT_SECRET, JWT_AUDIENCE } = c.env;
        const payload = await verifyToken(jwt, JWT_SECRET);
        if (
          payload &&
          typeof payload === "object" &&
          payload.aud === JWT_AUDIENCE
        ) {
          const userId = payload.userId;
          if (typeof userId === "string" && userId.length > 0) {
            c.set("userId", createUserId(userId));
          }
        }
      } catch {
        // Token invalid — continue as unauthenticated
      }
    }
  }

  await next();
}
