import { setCookie } from "hono/cookie";
import { sign } from "hono/jwt";

import bcrypt from "bcrypt";

import { config } from "@/backend/config";
import { HonoContext, JwtPayload } from "@/backend/context";
import { AppError, AuthError } from "@/backend/error";
import { LoginRequest } from "@/types/request";
import { LoginResponseSchema } from "@/types/response";

import { UserUsecase } from "../user";

export function newAuthHandler(userUsecase: UserUsecase) {
  return {
    login: login(userUsecase),
    logout: logout(),
  };
}

function login(userUsecase: UserUsecase) {
  return async (c: HonoContext) => {
    const { login_id, password }: LoginRequest = await c.req.json();

    const user = await userUsecase.getUserByLoginId(login_id);
    if (!user) {
      throw new AuthError("invalid login id or password");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new AuthError("invalid login id or password");
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

    const res = LoginResponseSchema.safeParse(user);
    if (!res.success) {
      throw new AppError("failed to parse user", 500);
    }

    return c.json(res.data);
  };
}

function logout() {
  return async (c: HonoContext) => {
    setCookie(c, "auth", "", {
      httpOnly: true,
    });

    return c.json({ message: "logout" });
  };
}
