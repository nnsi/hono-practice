import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import { loginRequestSchema } from "@/types/request";

import { newUserRepository } from "../user";

import { newAuthHandler } from "./authHandler";
import { newAuthUsecase } from "./authUsecase";

import type { AppContext } from "../../context";

export function createAuthRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        repo: ReturnType<typeof newUserRepository>;
        uc: ReturnType<typeof newAuthUsecase>;
        h: ReturnType<typeof newAuthHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.get("db");

    const repo = newUserRepository(db);
    const uc = newAuthUsecase(repo);
    const h = newAuthHandler(uc);

    c.set("repo", repo);
    c.set("uc", uc);
    c.set("h", h);

    return next();
  });

  return app
    .post("/login", zValidator("json", loginRequestSchema), async (c) => {
      const { JWT_SECRET, NODE_ENV } = c.env;
      const params = c.req.valid("json");

      const { token, payload, res } = await c.var.h.login(params, JWT_SECRET);

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

export const authRoute = createAuthRoute();
