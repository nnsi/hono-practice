import type { CreateUserRequest } from "@dtos/request";
import { type GetUserResponse, GetUserResponseSchema } from "@dtos/response";

import { AppError } from "../../error";

import type { UserUsecase } from ".";
import type { AuthHandler } from "../auth/authHandler";
import type { UserId } from "@backend/domain";

export function newUserHandler(uc: UserUsecase, authH: AuthHandler) {
  return {
    createUser: createUser(uc, authH),
    getMe: getMe(uc),
  };
}

function createUser(uc: UserUsecase, authH: AuthHandler) {
  return async (params: CreateUserRequest, secret: string) => {
    await uc.createUser(params, secret);
    const loginResult = await authH.login({
      login_id: params.loginId,
      password: params.password,
    });
    return loginResult;
  };
}

function getMe(uc: UserUsecase) {
  return async (userId: UserId): Promise<GetUserResponse> => {
    const user = await uc.getUserById(userId);
    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }
    return parsedUser.data;
  };
}
