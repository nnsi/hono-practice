import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { UnauthorizedError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import {
  createRateLimitMiddleware,
  loginRateLimitConfig,
} from "@backend/middleware/rateLimitMiddleware";
import { googleLoginRequestSchema, loginRequestSchema } from "@dtos/request";
import { zValidator } from "@hono/zod-validator";

import type { AppContext } from "../../context";
import { newUserRepository } from "../user";
import { newUserUsecase } from "../user/userUsecase";
import { newAuthHandler } from "./authHandler";
import type { OAuthVerifierMap } from "./authUsecase";
import { newAuthUsecase } from "./authUsecase";
import { googleVerify } from "./googleVerify";
import { MultiHashPasswordVerifier } from "./passwordVerifier";
import { newRefreshTokenRepository } from "./refreshTokenRepository";
import { newUserProviderRepository } from "./userProviderRepository";

export function createAuthRoute(oauthVerifiers: OAuthVerifierMap) {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newAuthHandler>;
      };
    }
  >();

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
    const h = newAuthHandler(uc);

    c.set("h", h);

    return next();
  });

  // レートリミットミドルウェア（KVStoreがある場合のみ有効）
  app.use("/login", async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) return next();
    return createRateLimitMiddleware(
      kv,
      loginRateLimitConfig,
      c.get("tracer"),
    )(c, next);
  });

  app.use("/google", async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) return next();
    return createRateLimitMiddleware(
      kv,
      loginRateLimitConfig,
      c.get("tracer"),
    )(c, next);
  });

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const { NODE_ENV } = c.env;
      const body = c.req.valid("json");

      const { token, refreshToken } = await c.var.h.login(body);

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
    .post("/token", async (c) => {
      const { NODE_ENV } = c.env;
      // Try to get refresh token from cookie first (for web)
      let refreshTokenValue = getCookie(c, "refresh_token");

      // If not in cookie, try to get from header (for mobile)
      if (!refreshTokenValue) {
        const authHeader = c.req.header("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          refreshTokenValue = authHeader.substring(7);
        }
      }

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

        const storedToken =
          await c.var.h.fetchRefreshToken(refreshTokenValue);

        const { token, refreshToken } = await c.var.h.rotateRefreshToken(
          storedToken,
          fireAndForgetFn,
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
      } catch (_error) {
        // Let the error bubble up to be handled by the global error handler
        throw new UnauthorizedError("invalid refresh token");
      }
    })
    .post("/logout", authMiddleware, async (c) => {
      const userId = c.get("userId");
      // Try to get refresh token from cookie first (for web)
      let refreshTokenValue = getCookie(c, "refresh_token");

      // If not in cookie, try to get from header (for mobile)
      if (!refreshTokenValue) {
        const authHeader = c.req.header("X-Refresh-Token");
        if (authHeader) {
          refreshTokenValue = authHeader;
        }
      }

      if (!refreshTokenValue) {
        return c.json({ message: "refresh token not found" }, 401);
      }
      const result = await c.var.h.logout(userId, refreshTokenValue);

      const isDev =
        c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test";
      // Only clear refresh token cookie since access token is now in memory
      setCookie(c, "refresh_token", "", {
        httpOnly: true,
        secure: !isDev,
        expires: new Date(0),
        ...(isDev ? {} : { sameSite: "None" }),
        path: "/",
      });

      return c.json(result);
    })
    .post(
      "/google",
      zValidator("json", googleLoginRequestSchema),
      async (c) => {
        const { NODE_ENV, GOOGLE_OAUTH_CLIENT_ID } = c.env;
        const body = c.req.valid("json");

        const { token, refreshToken, userId } = await c.var.h.googleLogin(
          body,
          GOOGLE_OAUTH_CLIENT_ID,
        );

        // user情報を取得
        const db = c.env.DB;
        const repo = newUserRepository(db);
        const userProviderRepo = newUserProviderRepository(db);
        const userUsecase = newUserUsecase(
          repo,
          userProviderRepo,
          c.get("tracer") ?? noopTracer,
        );
        const user = await userUsecase.getUserById(userId);

        const isDev = NODE_ENV === "development" || NODE_ENV === "test";
        // Only set refresh token cookie, access token is returned in response body
        setCookie(c, "refresh_token", refreshToken, {
          httpOnly: true,
          secure: !isDev,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ...(isDev ? {} : { sameSite: "None" }),
        });

        return c.json({ user, token });
      },
    )
    .post(
      "/google/link",
      authMiddleware,
      zValidator("json", googleLoginRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const { GOOGLE_OAUTH_CLIENT_ID } = c.env;
        const body = c.req.valid("json");
        await c.var.h.linkProvider(
          userId,
          "google",
          body,
          GOOGLE_OAUTH_CLIENT_ID,
        );
        return c.json({ message: "アカウントを紐付けました" });
      },
    );
}

export const authRoute = createAuthRoute({ google: googleVerify });
