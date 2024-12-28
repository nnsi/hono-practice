import { Hono } from "hono";
import { setCookie } from "hono/cookie";

import { zValidator } from "@hono/zod-validator";

import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import { loginRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { newUserRepository } from "../user";

import { newAuthHandler, newAuthUsecase } from ".";

const app = new Hono<AppContext>();

const repo = newUserRepository(drizzle);
const uc = newAuthUsecase(repo);
const h = newAuthHandler(uc);

export const authRoute = app
  .post("/login", zValidator("json", loginRequestSchema), async (c) => {
    const params = c.req.valid("json");

    const { token, payload, res } = await h.login(params);

    setCookie(c, "auth", token, {
      httpOnly: true,
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
