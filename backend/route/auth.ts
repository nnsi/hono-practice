import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { sign } from "hono/jwt";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/backend/lib/prisma";
import bcrypt from "bcrypt";
import { JwtPayload } from "../middleware/authMiddleware";
import { loginRequestSchema, LoginRequest } from "@/types/request/LoginRequest";
import {
  createUserRequestSchema,
  CreateUserRequest,
} from "@/types/request/CreateUserRequest";
import { config } from "../config";

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

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ ...userWithoutPassword });
  }
);

const createUserHandler = factory.createHandlers(
  zValidator("json", createUserRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json({ message: "invalid request" }, 400);
    }
  }),
  async (c) => {
    const { name, login_id, password }: CreateUserRequest = await c.req.json();
    const cryptedPassword = bcrypt.hashSync(password, 10);

    try {
      const loginIdExists = await prisma.user.findFirst({
        where: {
          loginId: login_id,
        },
      });
      if (loginIdExists) {
        return c.json({ message: "別のログインIDを指定してください" }, 500);
      }
    } catch (e) {
      return c.json({ message: "ユーザー作成に失敗しました" }, 500);
    }

    let createUser;
    try {
      createUser = await prisma.user.create({
        data: {
          name,
          loginId: login_id,
          password: cryptedPassword,
        },
      });
    } catch (e: any) {
      return c.json({ message: "ユーザー作成に失敗しました" }, 500);
    }

    const token = await sign(
      { id: createUser.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      config.JWT_SECRET
    );
    setCookie(c, "auth", token, {
      httpOnly: true,
    });

    return c.json({ message: "user created" });
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
  .post("/create-user", ...createUserHandler)
  .get("/logout", ...logoutHandler);
