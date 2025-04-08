import type { Next } from "hono";
import { verify } from "hono/jwt";

import { createUserId } from "../domain";
import { AuthError } from "../error";

import type { HonoContext } from "../context";

export function verifyToken(jwt: string, secret: string) {
  return verify(jwt, secret);
}

export async function authMiddleware(c: HonoContext, next: Next) {
  const jwt = c.req.header("Authorization")?.split(" ")[1];

  if (!jwt) {
    throw new AuthError("unauthorized");
  }
  try {
    const { JWT_SECRET } = c.env;
    const payload = await verifyToken(jwt, JWT_SECRET);

    c.set("jwtPayload", payload);
    c.set("userId", createUserId(payload.userId as string));
  } catch (e) {
    throw new AuthError("unauthorized");
  }

  await next();
}
