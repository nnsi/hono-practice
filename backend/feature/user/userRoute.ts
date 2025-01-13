import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import { createUserRequestSchema } from "@/types/request";

import { authMiddleware } from "../../middleware/authMiddleware";

import { newUserHandler } from "./userHandler";
import { newUserRepository } from "./userRepository";
import { newUserUsecase } from "./userUsecase";

import type { AppContext } from "../../context";

export function createUserRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newUserRepository>;
        uc: ReturnType<typeof newUserUsecase>;
        h: ReturnType<typeof newUserHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newUserRepository(db);
    const uc = newUserUsecase(repo);
    const h = newUserHandler(uc);

    c.set("repo", repo);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .post("/", zValidator("json", createUserRequestSchema), async (c) => {
      const { JWT_SECRET, NODE_ENV } = c.env;

      const token = await c.var.h.createUser(c.req.valid("json"), JWT_SECRET);

      setCookie(c, "auth", token, {
        httpOnly: true,
        secure: NODE_ENV !== "development",
      });

      return c.body(null, 204);
    })
    .get("/me", authMiddleware, async (c) => {
      const id = c.get("userId");
      const res = await c.var.h.getMe(id);

      return c.json(res);
    });
}

export const userRoute = createUserRoute();
