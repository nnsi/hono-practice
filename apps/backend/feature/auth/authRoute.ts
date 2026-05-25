import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { UnauthorizedError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import {
  applyRateLimit,
  loginRateLimitConfig,
  tokenRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { isMobileClient } from "@backend/utils/clientDetection";
import { zValidator } from "@hono/zod-validator";
import { loginRequestSchema } from "@packages/types/request";

import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import { newUserRepository } from "../user";
import { newUserConsentRepository } from "../user/userConsentRepository";
import { newUserUsecase } from "../user/userUsecase";
import { appleVerify } from "./appleVerify";
import { newAuthHandler } from "./authHandler";
import { createAppleAuthRoutes } from "./authRouteApple";
import {
  type AuthRouteContext,
  clearRefreshCookie,
  setRefreshCookie,
} from "./authRouteContext";
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
    const logger = c.get("logger") ?? noopLogger;
    const refreshTokenRepo = newRefreshTokenRepository(
      db,
      logger.child({ repository: "refresh-token" }),
    );
    const passwordVerifier = new MultiHashPasswordVerifier();
    const userProviderRepo = newUserProviderRepository(db);
    const userConsentRepo = newUserConsentRepository(db);
    const txRunner = newDrizzleTransactionRunner(db);
    const tracer = c.get("tracer") ?? noopTracer;
    const uc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      userConsentRepo,
      txRunner,
      passwordVerifier,
      JWT_SECRET,
      JWT_AUDIENCE,
      oauthVerifiers,
      tracer,
    );
    const subscriptionRepo = newSubscriptionRepository(db);
    const subscriptionUc = newSubscriptionQueryUsecase(
      subscriptionRepo,
      tracer,
    );
    const userUc = newUserUsecase(
      repo,
      userProviderRepo,
      userConsentRepo,
      txRunner,
      subscriptionUc,
      tracer,
    );
    c.set("h", newAuthHandler(uc, userUc.getUserById, userUc.enrichUser));
    return next();
  });

  for (const path of ["/login", "/google", "/apple"]) {
    app.use(path, applyRateLimit(loginRateLimitConfig));
  }
  app.use("/token", applyRateLimit(tokenRateLimitConfig));

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const body = c.req.valid("json");
      const { token, refreshToken, user } = await c.var.h.login(body);
      setRefreshCookie(c, refreshToken);
      return c.json(
        isMobileClient(c) ? { token, refreshToken, user } : { token, user },
      );
    })
    .post("/token", async (c) => {
      const authHeader = c.req.header("Authorization");
      const refreshTokenValue = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : getCookie(c, "refresh_token");
      if (!refreshTokenValue) {
        throw new UnauthorizedError("refresh token not found");
      }
      const { token, refreshToken, user } =
        await c.var.h.rotateRefreshToken(refreshTokenValue);
      setRefreshCookie(c, refreshToken);
      return c.json(
        isMobileClient(c) ? { token, refreshToken, user } : { token, user },
      );
    })
    .post("/logout", authMiddleware, async (c) => {
      const userId = c.get("userId");
      let refreshTokenValue = getCookie(c, "refresh_token");
      // X-Refresh-Token は mobile 専用 fallback。ブラウザ環境では cookie のみ受け付ける
      if (!refreshTokenValue && isMobileClient(c)) {
        const authHeader = c.req.header("X-Refresh-Token");
        if (authHeader) refreshTokenValue = authHeader;
      }
      if (!refreshTokenValue) {
        return c.json({ message: "refresh token not found" }, 401);
      }
      const result = await c.var.h.logout(userId, refreshTokenValue);
      clearRefreshCookie(c);
      return c.json(result);
    })
    .route("/google", createGoogleAuthRoutes())
    .route("/apple", createAppleAuthRoutes());
}

export const authRoute = createAuthRoute({
  google: googleVerify,
  apple: appleVerify,
});
