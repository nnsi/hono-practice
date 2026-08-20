import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

import type { Logger } from "@backend/lib/logger";

import type { AppContext } from "../context";
import { AppError, UnauthorizedError } from "../error";
import { assertAdminOrigin } from "../feature/admin/adminAccessPolicy";
import {
  type AdminAuthDependencies,
  resolveAdminAuthHandler,
  resolveAdminOriginConfig,
} from "../feature/admin/adminAuthDi";
import { getAdminSessionToken } from "../feature/admin/adminSessionCookie";
import { getAdminJwtSecret } from "../utils/adminJwt";

async function verifyAdminJwt(
  jwt: string,
  secret: string,
  logger: Logger | undefined,
): Promise<Record<string, unknown>> {
  const payload = await verify(jwt, secret, "HS256").catch((e: unknown) => {
    // 攻撃検知のためサーバ側ログには残す（外部レスポンスには漏らさない）
    logger?.warn("admin JWT verify failed", {
      reason: e instanceof Error ? e.message : String(e),
    });
    return null;
  });
  if (!payload || typeof payload !== "object") {
    throw new UnauthorizedError("unauthorized");
  }
  return payload as Record<string, unknown>;
}

export function createAdminAuthMiddleware(
  dependencies: AdminAuthDependencies = {},
) {
  return createMiddleware<AppContext>(async (c, next) => {
    const sessionToken = getAdminSessionToken(c);
    if (sessionToken) {
      assertAdminOrigin(
        c.req.header("Origin"),
        resolveAdminOriginConfig(c.env),
      );
      const session = await resolveAdminAuthHandler(
        c.env,
        dependencies,
      ).getSession(sessionToken);
      c.set("adminEmail", session.email);
      await next();
      return;
    }

    // Transitional test-only path for existing route integration fixtures.
    // Deployed environments accept only revocable DB-backed sessions.
    if (c.env.NODE_ENV !== "test") {
      throw new UnauthorizedError("unauthorized");
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("unauthorized");
    }

    const jwt = authHeader.slice(7);
    if (!jwt) {
      throw new UnauthorizedError("unauthorized");
    }

    const { JWT_AUDIENCE } = c.env;
    const adminSecret = getAdminJwtSecret(c.env);
    const payload = await verifyAdminJwt(jwt, adminSecret, c.get("logger"));

    if (payload.aud !== JWT_AUDIENCE) {
      throw new UnauthorizedError("unauthorized");
    }
    if (payload.role !== "admin") {
      throw new AppError("forbidden", 403);
    }
    if (typeof payload.email !== "string" || payload.email.length === 0) {
      throw new UnauthorizedError("unauthorized");
    }

    c.set("adminEmail", payload.email);

    await next();
  });
}

export const adminAuthMiddleware = createAdminAuthMiddleware();
