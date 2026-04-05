import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

import type { AppContext } from "../context";
import { AppError, UnauthorizedError } from "../error";

export const adminAuthMiddleware = createMiddleware<AppContext>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("unauthorized");
    }

    const jwt = authHeader.slice(7);
    if (!jwt) {
      throw new UnauthorizedError("unauthorized");
    }

    try {
      const { JWT_SECRET, JWT_AUDIENCE } = c.env;
      const payload = await verify(jwt, JWT_SECRET, "HS256");

      if (
        !payload ||
        typeof payload !== "object" ||
        payload.aud !== JWT_AUDIENCE
      ) {
        throw new UnauthorizedError("unauthorized");
      }

      if (payload.role !== "admin") {
        throw new AppError("forbidden", 403);
      }

      if (typeof payload.email !== "string" || payload.email.length === 0) {
        throw new UnauthorizedError("unauthorized");
      }

      c.set("adminEmail", payload.email);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new UnauthorizedError("unauthorized");
    }

    await next();
  },
);
