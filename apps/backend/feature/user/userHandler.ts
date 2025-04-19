import type { CreateUserRequest } from "@dtos/request";
import { type GetUserResponse, GetUserResponseSchema } from "@dtos/response";

import { AppError } from "../../error";

import type { UserUsecase } from ".";
import type { UserId } from "@backend/domain";

export function newUserHandler(uc: UserUsecase) {
  return {
    createUser: createUser(uc),
    getMe: getMe(uc),
  };
}

function createUser(uc: UserUsecase) {
  return async (params: CreateUserRequest, secret: string) => {
    const token = await uc.createUser(params, secret);

    return token;
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
