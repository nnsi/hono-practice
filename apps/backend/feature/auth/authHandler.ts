import { AppError } from "@backend/error";
import { LoginResponseSchema } from "@dtos/response";

import type { AuthUsecase } from ".";
import type { LoginRequest } from "@dtos/request";

export function newAuthHandler(authUsecase: AuthUsecase) {
  return {
    login: login(authUsecase),
  };
}

function login(authUsecase: AuthUsecase) {
  return async (params: LoginRequest, secret: string) => {
    const { login_id, password } = params;

    const user = await authUsecase.login(login_id, password);

    const { token, payload } = await authUsecase.getToken(user, secret);

    const res = LoginResponseSchema.safeParse(user);
    if (!res.success) {
      throw new AppError("failed to parse user", 500);
    }

    return { token, payload, res: res.data };
  };
}
