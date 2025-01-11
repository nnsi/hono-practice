import type { Next } from "hono";
import { env } from "hono/adapter";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import { createUserId } from "../domain";
import { AuthError } from "../error";

import type { HonoContext } from "../context";

export async function authMiddleware(c: HonoContext, next: Next) {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    throw new AuthError("unauthorized");
  }
  try {
    const { JWT_SECRET } = env(c);
    const payload = await verify(jwt, JWT_SECRET);
    c.set("jwtPayload", payload);
    c.set("userId", createUserId(payload.id as string));
  } catch (e) {
    throw new AuthError("unauthorized");
  }

  await next();
}
