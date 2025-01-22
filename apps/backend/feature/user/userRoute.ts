import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { verifyToken } from "@backend/middleware/authMiddleware";
import { createUserRequestSchema } from "@dtos/request";
import { zValidator } from "@hono/zod-validator";

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
        sameSite: "None",
      });

      return c.body(null, 204);
    })
    .get("/me", async (c) => {
      try {
        await verifyToken(getCookie(c, "auth") ?? "", c.env.JWT_SECRET);
      } catch (e) {
        return c.json({ message: "unauthorized" }, 401);
      }

      return c.body(null, 204);
    });
}

export const userRoute = createUserRoute();
