import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";

import { loginRequestSchema, refreshTokenRequestSchema } from "@dtos/request";

import { newUserRepository } from "../user";

import { newAuthHandler } from "./authHandler";
import { newAuthUsecase } from "./authUsecase";
import { BcryptPasswordVerifier } from "./passwordVerifier";
import { newRefreshTokenRepository } from "./refreshTokenRepository";

import type { AppContext } from "../../context";

export function createAuthRoute() {
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
    const passwordVerifier = new BcryptPasswordVerifier();
    const uc = newAuthUsecase(
      repo,
      refreshTokenRepo,
      passwordVerifier,
      JWT_SECRET,
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
    .get("/logout", authMiddleware, async (c) => {
      const userId = c.get("userId");
      const result = await c.var.h.logout(userId);

      setCookie(c, "auth", "", {
        httpOnly: true,
        secure: c.env.NODE_ENV !== "development",
        expires: new Date(0),
        sameSite: "None",
        path: "/",
      });

      setCookie(c, "refresh_token", "", {
        httpOnly: true,
        secure: c.env.NODE_ENV !== "development",
        expires: new Date(0),
        sameSite: "None",
        path: "/",
      });

      return c.json(result);
    });
}

export const authRoute = createAuthRoute();
