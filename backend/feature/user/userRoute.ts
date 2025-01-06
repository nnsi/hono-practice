import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import { type DrizzleInstance, drizzle } from "@/backend/infra/drizzle";
import { createUserRequestSchema } from "@/types/request";

import { authMiddleware } from "../../middleware/authMiddleware";

import { newUserHandler } from "./userHandler";
import { newUserRepository } from "./userRepository";
import { newUserUsecase } from "./userUsecase";

import type { AppContext } from "../../context";

export function createUserRoute(db: DrizzleInstance) {
  const app = new Hono<AppContext>();

  const repo = newUserRepository(db);
  const uc = newUserUsecase(repo);
  const h = newUserHandler(uc);

  return app
    .post("/", zValidator("json", createUserRequestSchema), async (c) => {
      const token = await h.createUser(c.req.valid("json"));

      setCookie(c, "auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      return c.body(null, 204);
    })
    .get("/me", authMiddleware, async (c) => {
      const id = c.get("userId");
      const res = await h.getMe(id);

      return c.json(res);
    });
}

export const userRoute = createUserRoute(drizzle);
