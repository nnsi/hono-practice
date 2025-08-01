import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";

import { createUserRequestSchema } from "@dtos/request";

import { newAuthHandler } from "../auth/authHandler";
import { newAuthUsecase } from "../auth/authUsecase";
import { googleVerify } from "../auth/googleVerify";
import { newRefreshTokenRepository } from "../auth/refreshTokenRepository";
import { newUserProviderRepository } from "../auth/userProviderRepository";

import { newUserHandler } from "./userHandler";
import { newUserRepository } from "./userRepository";
import { newUserUsecase } from "./userUsecase";

import type { AppContext } from "../../context";

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
    const { JWT_SECRET } = c.env;

    const repo = newUserRepository(db);
    const userProviderRepo = newUserProviderRepository(db);
    const refreshTokenRepo = newRefreshTokenRepository(db);
    const passwordVerifier = new (
      await import("../auth/passwordVerifier")
    ).MultiHashPasswordVerifier();
    const authUc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      userProviderRepo,
      passwordVerifier,
      JWT_SECRET,
      { google: googleVerify },
    );
    const authH = newAuthHandler(authUc);
    const uc = newUserUsecase(repo, userProviderRepo);
    const h = newUserHandler(uc, authH);

    c.set("h", h);
    c.set("authH", authH);

    return next();
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
      } catch (e) {
        return c.json({ message: "unauthorized" }, 401);
      }
    });
}

export const userRoute = createUserRoute();
