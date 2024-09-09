import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { config } from "../config";

export async function authMiddleware(
  c: Context<{}, "/users/*", {}>,
  next: Next
) {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    return c.json({ message: "unauthorized" }, 401);
  }
  try {
    const payload = await verify(jwt, config.JWT_SECRET);
    c.set("jwtPayload", payload);
  } catch (e) {
    return c.json({ message: "unauthorized" }, 401);
  }

  await next();
}

export type JwtPayload = {
  id: string;
  exp: number;
};

export type JwtEnv = {
  Variables: {
    jwtPayload: JwtPayload;
  };
};
