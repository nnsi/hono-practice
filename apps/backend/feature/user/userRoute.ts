import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { noopTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import {
  createRateLimitMiddleware,
  registerRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { createUserRequestSchema } from "@dtos/request";
import { zValidator } from "@hono/zod-validator";

import type { AppContext } from "../../context";
import { newAuthHandler } from "../auth/authHandler";
import { newAuthUsecase } from "../auth/authUsecase";
import { googleVerify } from "../auth/googleVerify";
import { newRefreshTokenRepository } from "../auth/refreshTokenRepository";
import { newUserProviderRepository } from "../auth/userProviderRepository";
import { newUserHandler } from "./userHandler";
import { newUserRepository } from "./userRepository";
import { newUserUsecase } from "./userUsecase";

export function createUserRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newUserHandler>;
        authH: ReturnType<typeof newAuthHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const { JWT_SECRET, JWT_AUDIENCE } = c.env;

    const repo = newUserRepository(db);
    const userProviderRepo = newUserProviderRepository(db);
    const refreshTokenRepo = newRefreshTokenRepository(db);
    const passwordVerifier = new (
      await import("../auth/passwordVerifier")
    ).MultiHashPasswordVerifier();
    const tracer = c.get("tracer") ?? noopTracer;
    const authUc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      passwordVerifier,
      JWT_SECRET,
      JWT_AUDIENCE,
      { google: googleVerify },
      tracer,
    );
    const authH = newAuthHandler(authUc);
    const uc = newUserUsecase(repo, userProviderRepo, tracer);
    const h = newUserHandler(uc, authH);

    c.set("h", h);
    c.set("authH", authH);

    return next();
  });

  // ユーザー登録のレートリミット（KVStoreがある場合のみ有効）
  app.use("/", async (c, next) => {
    // GETリクエストはレートリミット対象外
    if (c.req.method !== "POST") return next();
    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) return next();
    return createRateLimitMiddleware(
      kv,
      registerRateLimitConfig,
      c.get("tracer"),
    )(c, next);
  });

  return app
    .post("/", zValidator("json", createUserRequestSchema), async (c) => {
      const { JWT_SECRET, NODE_ENV } = c.env;

      const { token, refreshToken } = await c.var.h.createUser(
        c.req.valid("json"),
        JWT_SECRET,
      );

      const isDev = NODE_ENV === "development" || NODE_ENV === "test";
      // Only set refresh token cookie, access token is returned in response body
      setCookie(c, "refresh_token", refreshToken, {
        httpOnly: true,
        secure: !isDev,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ...(isDev ? {} : { sameSite: "None" }),
      });

      return c.json({ token, refreshToken });
    })
    .get("/me", authMiddleware, async (c) => {
      try {
        const userId = c.get("userId");
        const user = await c.var.h.getMe(userId);
        return c.json(user);
      } catch (_e) {
        return c.json({ message: "unauthorized" }, 401);
      }
    })
    .delete("/me", authMiddleware, async (c) => {
      const userId = c.get("userId");
      await c.var.h.deleteMe(userId);
      return c.body(null, 204);
    });
}

export const userRoute = createUserRoute();
