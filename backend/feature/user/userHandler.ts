import type { UserId } from "@/backend/domain";
import type { CreateUserRequest } from "@/types/request";
import { GetUserResponseSchema } from "@/types/response/";

import { AppError } from "../../error";

import type { UserUsecase } from ".";

export function newUserHandler(uc: UserUsecase) {
  return {
    createUser: createUser(uc),
    getMe: getMe(uc),
  };
}

function createUser(uc: UserUsecase) {
  return async (params: CreateUserRequest) => {
    const token = await uc.createUser(params);

    return token;
  };
}

function getMe(uc: UserUsecase) {
  return async (userId: UserId) => {
    const user = await uc.getUserById(userId);

    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }

    return parsedUser.data;
  };
}
