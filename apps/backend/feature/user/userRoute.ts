import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { createUserId } from "@backend/domain/user/userId";
import { verifyToken } from "@backend/middleware/authMiddleware";
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

      setCookie(c, "auth", token, {
        httpOnly: true,
        secure: NODE_ENV !== "development",
        sameSite: "None",
      });

      return c.json({ token, refreshToken });
    })
    .get("/me", async (c) => {
      try {
        const token = c.req.header("Authorization")?.split(" ")[1] ?? "";
        const payload = await verifyToken(token, c.env.JWT_SECRET);
        const userId = createUserId(String(payload.userId || payload.id));
        const user = await c.var.h.getMe(userId);
        return c.json(user);
      } catch (e) {
        return c.json({ message: "unauthorized" }, 401);
      }
    });
}

export const userRoute = createUserRoute();
