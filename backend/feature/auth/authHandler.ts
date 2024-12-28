import { AppError } from "@/backend/error";
import { LoginRequest } from "@/types/request";
import { LoginResponseSchema } from "@/types/response";

import { AuthUsecase } from ".";

export function newAuthHandler(authUsecase: AuthUsecase) {
  return {
    login: login(authUsecase),
  };
}

function login(authUsecase: AuthUsecase) {
  return async (params: LoginRequest) => {
    const { login_id, password } = params;

    const user = await authUsecase.login(login_id, password);

    const { token, payload } = await authUsecase.getToken(user);

    const res = LoginResponseSchema.safeParse(user);
    if (!res.success) {
      throw new AppError("failed to parse user", 500);
    }

    return { token, payload, res: res.data };
  };
}
