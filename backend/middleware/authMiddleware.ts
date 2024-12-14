import { Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

import { config } from "../config";
import { HonoContext } from "../context";
import { UserId } from "../domain";

export async function authMiddleware(c: HonoContext, next: Next) {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    return c.json({ message: "unauthorized" }, 401);
  }
  try {
    const payload = await verify(jwt, config.JWT_SECRET);
    c.set("jwtPayload", payload);
    c.set("userId", UserId.create(payload.id as string));
  } catch (e) {
    console.log(e);
    return c.json({ message: "unauthorized" }, 401);
  }

  await next();
}
