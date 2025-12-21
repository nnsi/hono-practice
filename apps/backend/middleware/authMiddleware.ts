import type { Next } from "hono";
import { verify } from "hono/jwt";

import type { HonoContext } from "../context";
import { createUserId } from "../domain";
import { UnauthorizedError } from "../error";

export function verifyToken(jwt: string, secret: string) {
  return verify(jwt, secret);
}

export async function authMiddleware(c: HonoContext, next: Next) {
  // Get token from Authorization header
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("unauthorized");
  }

  const jwt = authHeader.slice(7); // Remove "Bearer " prefix

  if (!jwt) {
    throw new UnauthorizedError("unauthorized");
  }

  try {
    const { JWT_SECRET, JWT_AUDIENCE } = c.env;
    const payload = await verifyToken(jwt, JWT_SECRET);

    // aud（Audience）を検証し、この API 向けに発行されたトークンのみ受け付ける
    // これが無いと「同じ署名鍵で別用途に発行した JWT」を誤って受け入れるリスクがある
    if (
      !payload ||
      typeof payload !== "object" ||
      (payload as any).aud !== JWT_AUDIENCE
    ) {
      throw new UnauthorizedError("unauthorized");
    }

    const userId = (payload as any).userId;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new UnauthorizedError("unauthorized");
    }

    c.set("jwtPayload", payload);
    c.set("userId", createUserId(userId));
  } catch (_e) {
    throw new UnauthorizedError("unauthorized");
  }

  await next();
}
