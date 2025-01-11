import { Hono } from "hono";
import { env } from "hono/adapter";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import {
  type DrizzleInstance,
  drizzle,
} from "@/backend/infra/drizzle/drizzleInstance";
import { loginRequestSchema } from "@/types/request";

import { newUserRepository } from "../user";

import { newAuthHandler } from "./authHandler";
import { newAuthUsecase } from "./authUsecase";

import type { AppContext } from "../../context";

export function createAuthRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newUserRepository(db);
  const uc = newAuthUsecase(repo);
  const h = newAuthHandler(uc);

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const { JWT_SECRET, NODE_ENV } = env(c);
      const params = c.req.valid("json");

      const { token, payload, res } = await h.login(params, JWT_SECRET);

      setCookie(c, "auth", token, {
        httpOnly: true,
        secure: NODE_ENV === "production",
        expires: new Date(payload.exp * 1000),
      });

      return c.json(res);
    })
    .get("/logout", async (c) => {
      setCookie(c, "auth", "", {
        httpOnly: true,
      });

      return c.json({ message: "success" });
    });
}

export const authRoute = createAuthRoute(drizzle);
