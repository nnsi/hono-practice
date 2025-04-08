import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { AuthError } from "@backend/error";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import { zValidator } from "@hono/zod-validator";

import { loginRequestSchema } from "@dtos/request";

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
        repo: ReturnType<typeof newUserRepository>;
        refreshTokenRepo: ReturnType<typeof newRefreshTokenRepository>;
        uc: ReturnType<typeof newAuthUsecase>;
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

    c.set("repo", repo);
    c.set("refreshTokenRepo", refreshTokenRepo);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const { NODE_ENV } = c.env;
      const body = c.req.valid("json");

      try {
        const { accessToken, refreshToken } = await c.var.uc.login(
          body.login_id,
          body.password,
        );

        setCookie(c, "auth", accessToken, {
          httpOnly: true,
          secure: NODE_ENV !== "development",
          expires: new Date(Date.now() + 15 * 60 * 1000),
          sameSite: "None",
        });

        return c.json({ token: accessToken, refreshToken });
      } catch (error) {
        if (error instanceof AuthError) {
          return c.json({ message: "invalid credentials" }, 401);
        }
        throw error;
      }
    })
    .post("/token", async (c) => {
      const { NODE_ENV } = c.env;
      const body = await c.req.json();

      if (!body || !body.refreshToken) {
        return c.json({ message: "invalid request body" }, 400);
      }

      try {
        const { accessToken, refreshToken } = await c.var.uc.refreshToken(
          body.refreshToken,
        );

        setCookie(c, "auth", accessToken, {
          httpOnly: true,
          secure: NODE_ENV !== "development",
          expires: new Date(Date.now() + 15 * 60 * 1000),
          sameSite: "None",
        });

        return c.json({ token: accessToken, refreshToken });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "invalid refresh token"
        ) {
          return c.json({ message: "invalid refresh token" }, 401);
        }
        throw error;
      }
    })
    .get("/logout", authMiddleware, async (c) => {
      try {
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
      } catch (error) {
        console.error("Logout error:", error);
        return c.json({ message: "Internal server error" }, 500);
      }
    });
}

export const authRoute = createAuthRoute();
