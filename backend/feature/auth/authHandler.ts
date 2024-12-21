import { setCookie } from "hono/cookie";

import { HonoContext } from "@/backend/context";
import { AppError } from "@/backend/error";
import { LoginRequest } from "@/types/request";
import { LoginResponseSchema } from "@/types/response";

import { AuthUsecase } from ".";

export function newAuthHandler(
  authUsecase: AuthUsecase,
) {
  return {
    login: login(authUsecase),
    logout: logout(),
  };
}

function login(authUsecase: AuthUsecase) {
  return async (c: HonoContext, params: LoginRequest) => {
    const { login_id, password } = params;

    const user = await authUsecase.login(login_id, password);

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
