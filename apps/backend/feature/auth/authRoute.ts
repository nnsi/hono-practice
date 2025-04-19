import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";

import {
  loginRequestSchema,
  refreshTokenRequestSchema,
  googleLoginRequestSchema,
} from "@dtos/request";

import { newUserRepository } from "../user";

import { newAuthHandler } from "./authHandler";
import { newAuthUsecase } from "./authUsecase";
import { googleVerify } from "./googleVerify";
import { MultiHashPasswordVerifier } from "./passwordVerifier";
import { newRefreshTokenRepository } from "./refreshTokenRepository";
import { newUserProviderRepository } from "./userProviderRepository";

import type { OAuthVerify } from "./oauthVerify";
import type { AppContext } from "../../context";

export function createAuthRoute(oauthVerify: OAuthVerify = googleVerify) {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newAuthHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const { JWT_SECRET } = c.env;

    const repo = newUserRepository(db);
    const refreshTokenRepo = newRefreshTokenRepository(db);
    const passwordVerifier = new MultiHashPasswordVerifier();
    const userProviderRepo = newUserProviderRepository(db);
    const uc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      passwordVerifier,
      JWT_SECRET,
      oauthVerify,
    );
    const h = newAuthHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const { NODE_ENV } = c.env;
      const body = c.req.valid("json");

      const { token, refreshToken } = await c.var.h.login(body);

      setCookie(c, "auth", token, {
        httpOnly: true,
        secure: NODE_ENV !== "development",
        expires: new Date(Date.now() + 15 * 60 * 1000),
        sameSite: "None",
      });

      return c.json({ token, refreshToken });
    })
    .post(
      "/token",
      zValidator("json", refreshTokenRequestSchema),
      async (c) => {
        const { NODE_ENV } = c.env;
        const body = c.req.valid("json");

        const { token, refreshToken } = await c.var.h.refreshToken(
          body.refreshToken,
        );

        setCookie(c, "auth", token, {
          httpOnly: true,
          secure: NODE_ENV !== "development",
          expires: new Date(Date.now() + 15 * 60 * 1000),
          sameSite: "None",
        });

        return c.json({ token, refreshToken });
      },
    )
    .post(
      "/logout",
      authMiddleware,
      zValidator("json", refreshTokenRequestSchema),
      async (c) => {
        const userId = c.get("userId");
        const body = c.req.valid("json");
        const result = await c.var.h.logout(userId, body.refreshToken);

        setCookie(c, "auth", "", {
          httpOnly: true,
          secure: c.env.NODE_ENV !== "development",
          expires: new Date(0),
          sameSite: "None",
          path: "/",
        });

        return c.json(result);
      },
    )
    .post(
      "/google",
      zValidator("json", googleLoginRequestSchema),
      async (c) => {
        const { NODE_ENV, GOOGLE_OAUTH_CLIENT_ID } = c.env;
        const body = c.req.valid("json");

        const { token, refreshToken } = await c.var.h.googleLogin(
          body,
          GOOGLE_OAUTH_CLIENT_ID,
        );

        setCookie(c, "auth", token, {
          httpOnly: true,
          secure: NODE_ENV !== "development",
          expires: new Date(Date.now() + 15 * 60 * 1000),
          sameSite: "None",
        });

        return c.json({ token, refreshToken });
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
        await c.var.h.linkGoogleAccount(userId, body, GOOGLE_OAUTH_CLIENT_ID);
        return c.json({ message: "Googleアカウントを紐付けました" });
      },
    );
}

export const authRoute = createAuthRoute();
