import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { PrismaClient } from "@prisma/client";
import { sign } from "hono/jwt";
import bcrypt from "bcrypt";
import { loginRequestSchema, LoginRequest } from "@/types/request/LoginRequest";
import {
  createUserRequestSchema,
  CreateUserRequest,
} from "@/types/request/CreateUserRequest";
import { JwtPayload } from "../middleware/authMiddleware";

const factory = createFactory<{ Variables: { prisma: PrismaClient } }>();
const app = new Hono();

const loginHandler = factory.createHandlers(
  zValidator("json", loginRequestSchema, async (result, c) => {
    if (!result.success) {
      return c.json({ message: "invalid request" }, 400);
    }
  }),
  async (c) => {
    const { login_id, password }: LoginRequest = await c.req.json();

    const prisma = c.get("prisma");
    const user = await prisma.user.findFirst({
      where: {
        login_id,
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

    const token = await sign(payload, "secret123");
    setCookie(c, "auth", token, {
      httpOnly: true,
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

    const cryptedPassword = await bcrypt.hashSync(password, 10);

    const prisma = c.get("prisma");
    const createUser = await prisma.user.create({
      data: {
        name,
        login_id,
        password: cryptedPassword,
      },
    });

    const token = await sign(
      { id: createUser.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      "secret123"
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
