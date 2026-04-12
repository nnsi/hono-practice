import type { TabPreference } from "@packages/domain/user/tabPreferenceSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type { CreateUserRequest } from "@packages/types/request";
import {
  type GetUserResponse,
  GetUserResponseSchema,
  type TabPreferenceResponse,
  TabPreferenceResponseSchema,
} from "@packages/types/response";

import { AppError } from "../../error";
import type { AuthHandler } from "../auth/authHandler";
import type { UserUsecase } from ".";

export function newUserHandler(uc: UserUsecase, authH: AuthHandler) {
  return {
    createUser: createUser(uc, authH),
    getMe: getMe(uc),
    getTabPreference: getTabPreference(uc),
    updateTabPreference: updateTabPreference(uc),
    deleteMe: deleteMe(uc),
  };
}

function createUser(uc: UserUsecase, authH: AuthHandler) {
  return async (params: CreateUserRequest) => {
    await uc.createUser(params);
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

function getTabPreference(uc: UserUsecase) {
  return async (userId: UserId): Promise<TabPreferenceResponse> => {
    const result = await uc.getTabPreference(userId);
    const parsed = TabPreferenceResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse tab preference", 500);
    }
    return parsed.data;
  };
}

function updateTabPreference(uc: UserUsecase) {
  return async (
    userId: UserId,
    preference: TabPreference,
  ): Promise<TabPreferenceResponse> => {
    const result = await uc.updateTabPreference(userId, preference);
    const parsed = TabPreferenceResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse tab preference", 500);
    }
    return parsed.data;
  };
}

function deleteMe(uc: UserUsecase) {
  return async (userId: UserId): Promise<void> => {
    await uc.deleteUser(userId);
  };
}
