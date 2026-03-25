import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { UnauthorizedError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import {
  createRateLimitMiddleware,
  loginRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { zValidator } from "@hono/zod-validator";
import { loginRequestSchema } from "@packages/types/request";

import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionUsecase } from "../subscription/subscriptionUsecase";
import { newUserRepository } from "../user";
import { newUserUsecase } from "../user/userUsecase";
import { appleVerify } from "./appleVerify";
import { newAuthHandler } from "./authHandler";
import { createAppleAuthRoutes } from "./authRouteApple";
import { type AuthRouteContext, setRefreshCookie } from "./authRouteContext";
import { createGoogleAuthRoutes } from "./authRouteGoogle";
import type { OAuthVerifierMap } from "./authUsecase";
import { newAuthUsecase } from "./authUsecase";
import { googleVerify } from "./googleVerify";
import { MultiHashPasswordVerifier } from "./passwordVerifier";
import { newRefreshTokenRepository } from "./refreshTokenRepository";
import { newUserProviderRepository } from "./userProviderRepository";

export function createAuthRoute(oauthVerifiers: OAuthVerifierMap) {
  const app = new Hono<AuthRouteContext>();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const { JWT_SECRET, JWT_AUDIENCE } = c.env;
    const repo = newUserRepository(db);
    const refreshTokenRepo = newRefreshTokenRepository(db);
    const passwordVerifier = new MultiHashPasswordVerifier();
    const userProviderRepo = newUserProviderRepository(db);
    const tracer = c.get("tracer") ?? noopTracer;
    const uc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      passwordVerifier,
      JWT_SECRET,
      JWT_AUDIENCE,
      oauthVerifiers,
      tracer,
    );
    const subscriptionRepo = newSubscriptionRepository(db);
    const subscriptionUc = newSubscriptionUsecase(subscriptionRepo, tracer);
    const userUc = newUserUsecase(
      repo,
      userProviderRepo,
      subscriptionUc,
      tracer,
    );
    c.set("h", newAuthHandler(uc, userUc.getUserById));
    return next();
  });

  for (const path of ["/login", "/google", "/apple"]) {
    app.use(path, async (c, next) => {
      const kv = c.env.RATE_LIMIT_KV;
      if (!kv) return next();
      return createRateLimitMiddleware(
        kv,
        loginRateLimitConfig,
        c.get("tracer"),
      )(c, next);
    });
  }

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const body = c.req.valid("json");
      const { token, refreshToken } = await c.var.h.login(body);
      setRefreshCookie(c, refreshToken);
      return c.json({ token, refreshToken });
    })
    .post("/token", async (c) => {
      const authHeader = c.req.header("Authorization");
      const refreshTokenValue = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : getCookie(c, "refresh_token");
      if (!refreshTokenValue) {
        return c.json({ message: "refresh token not found" }, 401);
      }
      try {
        const fireAndForgetFn = (p: Promise<unknown>) => {
          try {
            const ctx = c.executionCtx;
            if (ctx?.waitUntil) {
              ctx.waitUntil(p);
              return;
            }
          } catch {
            // テスト環境では executionCtx がthrowする
          }
          p.catch(() => {});
        };
        const storedToken = await c.var.h.fetchRefreshToken(refreshTokenValue);
        const { token, refreshToken } = await c.var.h.rotateRefreshToken(
          storedToken,
          fireAndForgetFn,
        );
        setRefreshCookie(c, refreshToken);
        return c.json({ token, refreshToken });
      } catch (_error) {
        throw new UnauthorizedError("invalid refresh token");
      }
    })
    .post("/logout", authMiddleware, async (c) => {
      const userId = c.get("userId");
      let refreshTokenValue = getCookie(c, "refresh_token");
      if (!refreshTokenValue) {
        const authHeader = c.req.header("X-Refresh-Token");
        if (authHeader) refreshTokenValue = authHeader;
      }
      if (!refreshTokenValue) {
        return c.json({ message: "refresh token not found" }, 401);
      }
      const result = await c.var.h.logout(userId, refreshTokenValue);
      const isDev =
        c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test";
      setCookie(c, "refresh_token", "", {
        httpOnly: true,
        secure: !isDev,
        expires: new Date(0),
        ...(isDev ? {} : { sameSite: "None" }),
        path: "/",
      });
      return c.json(result);
    })
    .route("/google", createGoogleAuthRoutes())
    .route("/apple", createAppleAuthRoutes());
}

export const authRoute = createAuthRoute({
  google: googleVerify,
  apple: appleVerify,
});
