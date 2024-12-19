import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { sign } from "hono/jwt";

import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcrypt";

import { prisma } from "@/backend/lib/prisma";
import { loginRequestSchema, LoginRequest } from "@/types/request/LoginRequest";

import { config } from "../config";
import { JwtPayload } from "../context";

const factory = createFactory();
const app = new Hono();

const loginHandler = factory.createHandlers(
  zValidator("json", loginRequestSchema, async (result, c) => {
    if (!result.success) {
      return c.json({ message: "invalid request" }, 400);
    }
  }),
  async (c) => {
    const { login_id, password }: LoginRequest = await c.req.json();

    const user = await prisma.user.findFirst({
      where: {
        loginId: login_id,
      },
      select: {
        id: true,
        password: true,
        name: true,
      },
    });

    if (!user) {
      return c.json({ message: "ログインに失敗しました" }, 401);
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return c.json({ message: "ログインに失敗しました" }, 401);
    }

    const payload: JwtPayload = {
      id: user.id,
      exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60,
    };

    const token = await sign(payload, config.JWT_SECRET);
    setCookie(c, "auth", token, {
      httpOnly: true,
      expires: new Date(payload.exp * 1000),
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ ...userWithoutPassword });
  }
);

const logoutHandler = factory.createHandlers(async (c) => {
  setCookie(c, "auth", "", {
    httpOnly: true,
  });
  return c.json({ message: "logged out" });
});

export const authRoute = app
  .post("/login", ...loginHandler)
  .get("/logout", ...logoutHandler);
