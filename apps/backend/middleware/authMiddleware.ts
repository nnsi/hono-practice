import type { Next } from "hono";
import { verify } from "hono/jwt";

import { createUserId } from "../domain";
import { UnauthorizedError } from "../error";

import type { HonoContext } from "../context";

export function verifyToken(jwt: string, secret: string) {
  return verify(jwt, secret);
}

export async function authMiddleware(c: HonoContext, next: Next) {
  const jwt = c.req.header("Authorization")?.split(" ")[1];

  if (!jwt) {
    throw new UnauthorizedError("unauthorized");
  }
  try {
    const { JWT_SECRET } = c.env;
    const payload = await verifyToken(jwt, JWT_SECRET);

    c.set("jwtPayload", payload);
    c.set("userId", createUserId(payload.userId as string));
  } catch (e) {
    throw new UnauthorizedError("unauthorized");
  }

  await next();
}
