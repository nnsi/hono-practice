import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import { drizzle } from "@/backend/infra/drizzle";
import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";

import { newUserHandler, newUserRepository, newUserUsecase } from ".";

const app = new Hono<AppContext>();

const repo = newUserRepository(drizzle);
const uc = newUserUsecase(repo);
const h = newUserHandler(uc);

export const userRoute = app
  .post("/", zValidator("json", createUserRequestSchema), async (c) => {
    const token = await h.createUser(c.req.valid("json"));

    setCookie(c, "auth", token, {
      httpOnly: true,
    });

    return c.body(null, 204);
  })
  .get("/me", authMiddleware, async (c) => {
    const id = c.get("userId");
    const res = await h.getMe(id);

    return c.json(res);
  });
