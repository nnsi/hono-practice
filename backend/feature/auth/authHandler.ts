import { setCookie } from "hono/cookie";

import bcrypt from "bcrypt";

import { HonoContext } from "@/backend/context";
import { AppError, AuthError } from "@/backend/error";
import { LoginRequest } from "@/types/request";
import { LoginResponseSchema } from "@/types/response";

import { UserUsecase } from "../user";

import { AuthUsecase } from ".";

export function newAuthHandler(
  authUsecase: AuthUsecase,
  userUsecase: UserUsecase
) {
  return {
    login: login(authUsecase, userUsecase),
    logout: logout(),
  };
}

function login(authUsecase: AuthUsecase, userUsecase: UserUsecase) {
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

    const { token, payload } = await authUsecase.getToken(user);

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
