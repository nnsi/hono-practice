import { Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import { config } from "../config";
import { HonoContext } from "../context";
import { createUserId } from "../domain";
import { AuthError } from "../error";

export async function authMiddleware(c: HonoContext, next: Next) {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    throw new AuthError("unauthorized");
  }
  try {
    const payload = await verify(jwt, config.JWT_SECRET);
    c.set("jwtPayload", payload);
    c.set("userId", createUserId(payload.id as string));
  } catch (e) {
    throw new AuthError("unauthorized");
  }

  await next();
}
