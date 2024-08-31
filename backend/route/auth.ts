import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PrismaClient } from "@prisma/client";
import { sign } from "hono/jwt";
import bcrypt from "bcrypt";

const factory = createFactory();
const app = new Hono();

const loginRequestSchema = z.object({
  login_id: z.string(),
  password: z.string(),
});

type LoginRequest = z.infer<typeof loginRequestSchema>;

const loginHandler = factory.createHandlers(
  zValidator("json", loginRequestSchema, async (result, c) => {
    if (!result.success) {
      return c.json({ message: "invalid request" }, 400);
    }
  }),
  async (c) => {
    const { login_id, password }: LoginRequest = await c.req.json();

    const prisma = new PrismaClient();
    const user = await prisma.user.findFirst({
      where: {
        login_id,
      },
      select:{
        id:true,
        password:true
      }
    });

    if (!user) {
      return c.json({ message: "ログインに失敗しました" }, 401);
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return c.json({ message: "ログインに失敗しました" }, 401);
    }

    const token = await sign(
      { id:user.id, exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60 },
      "secret123"
    );

    setCookie(c, "auth", token, {
      httpOnly: true,
    });
    return c.json({ message: "ログインに成功しました" });
  }
);

const validateHandler = factory.createHandlers(async (c) => {
  const cookie = getCookie(c, "auth");
  return c.json({ message: "mada", cookie });
});

const createUserRequestSchema = z.object({
  name: z.string().optional(),
  login_id: z.string(),
  password: z.string(),
});

type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

const createUserHandler = factory.createHandlers(
  zValidator("json", createUserRequestSchema, (result, c) => {
    if (!result.success) {
      return c.json({ message: "invalid request" }, 400);
    }
  }),
  async (c) => {
    const { name, login_id, password }: CreateUserRequest = await c.req.json();

    const cryptedPassword = await bcrypt.hashSync(password, 10);

    const prisma = new PrismaClient();
    await prisma.user.create({
      data: {
        name,
        login_id,
        password: cryptedPassword,
      },
    });

    return c.json({ message: "user created" });
  }
);

export const authRoute = app
  .post("/login", ...loginHandler)
  .post("/create-user", ...createUserHandler)
  .post("/validate", ...validateHandler);
