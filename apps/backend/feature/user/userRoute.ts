import { Hono } from "hono";

import { AppError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import {
  applyRateLimit,
  registerRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { isMobileClient } from "@backend/utils/clientDetection";
import { zValidator } from "@hono/zod-validator";
import {
  createUserRequestSchema,
  updateTabPreferenceRequestSchema,
} from "@packages/types/request";

import type { AppContext } from "../../context";
import { newApiKeyRepository } from "../apiKey/apiKeyRepository";
import { appleVerify } from "../auth/appleVerify";
import { newAuthHandler } from "../auth/authHandler";
import { clearRefreshCookie, setRefreshCookie } from "../auth/authRouteContext";
import { newAuthUsecase } from "../auth/authUsecase";
import { googleVerify } from "../auth/googleVerify";
import { newRefreshTokenRepository } from "../auth/refreshTokenRepository";
import { newUserProviderRepository } from "../auth/userProviderRepository";
import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newSubscriptionQueryUsecase } from "../subscription/subscriptionUsecase";
import { newUserConsentRepository } from "./userConsentRepository";
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
    const userConsentRepo = newUserConsentRepository(db);
    const logger = c.get("logger") ?? noopLogger;
    const refreshTokenRepo = newRefreshTokenRepository(
      db,
      logger.child({ repository: "refresh-token" }),
    );
    const apiKeyRepo = newApiKeyRepository(db);
    const txRunner = newDrizzleTransactionRunner(db);
    const passwordVerifier = new (
      await import("../auth/passwordVerifier")
    ).MultiHashPasswordVerifier();
    const tracer = c.get("tracer") ?? noopTracer;
    const authUc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      userConsentRepo,
      txRunner,
      passwordVerifier,
      JWT_SECRET,
      JWT_AUDIENCE,
      { google: googleVerify, apple: appleVerify },
      tracer,
    );
    const subscriptionRepo = newSubscriptionRepository(db);
    const subscriptionUc = newSubscriptionQueryUsecase(
      subscriptionRepo,
      tracer,
    );
    const uc = newUserUsecase(
      repo,
      userProviderRepo,
      userConsentRepo,
      txRunner,
      subscriptionUc,
      tracer,
      { refreshTokenRepo, apiKeyRepo },
      passwordVerifier,
    );
    const authH = newAuthHandler(authUc, uc.getUserById);
    const h = newUserHandler(uc, authH);

    c.set("h", h);
    c.set("authH", authH);

    return next();
  });

  // ユーザー登録のレートリミット（POST のみ）
  app.on("POST", "/", applyRateLimit(registerRateLimitConfig));

  return app
    .post("/", zValidator("json", createUserRequestSchema), async (c) => {
      // 409 を含む全エラーは onError ハンドラ経由でレスポンス化される
      const { token, refreshToken, user } = await c.var.h.createUser(
        c.req.valid("json"),
      );
      setRefreshCookie(c, refreshToken);
      return c.json(
        isMobileClient(c) ? { token, refreshToken, user } : { token, user },
      );
    })
    .get("/me", authMiddleware, async (c) => {
      const userId = c.get("userId");
      try {
        const user = await c.var.h.getMe(userId);
        return c.json(user);
      } catch (e) {
        // 認証は通過しているがユーザーが存在しない（削除済み等）→ 401 に変換
        if (e instanceof AppError && e.status === 404) {
          return c.json({ message: "unauthorized" }, 401);
        }
        throw e;
      }
    })
    .get("/tab-preference", authMiddleware, async (c) => {
      const userId = c.get("userId");
      try {
        const preference = await c.var.h.getTabPreference(userId);
        return c.json(preference);
      } catch (e) {
        return mapUserNotFoundToUnauthorized(e);
      }
    })
    .put(
      "/tab-preference",
      authMiddleware,
      zValidator("json", updateTabPreferenceRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const preference = c.req.valid("json");
        try {
          const res = await c.var.h.updateTabPreference(userId, preference);
          return c.json(res);
        } catch (e) {
          return mapUserNotFoundToUnauthorized(e);
        }
      },
    )
    .delete("/me", authMiddleware, async (c) => {
      const userId = c.get("userId");
      // usecase に refresh token revoke + API key soft delete を集約。route 層は
      // HTTP concern (cookie clear / status) のみ担当する
      await c.var.h.deleteMe(userId);
      clearRefreshCookie(c);
      return c.body(null, 204);
    });
}

export const userRoute = createUserRoute();

function mapUserNotFoundToUnauthorized(error: unknown) {
  if (error instanceof AppError && error.status === 404) {
    return new Response(JSON.stringify({ message: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  throw error;
}
