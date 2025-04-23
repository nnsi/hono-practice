import { createUserId } from "@backend/domain/user/userId";

import type { LoginRequest, GoogleLoginRequest } from "@dtos/request";
import { authResponseSchema } from "@dtos/response";

import { AppError } from "../../error";

import type { AuthUsecase } from "./authUsecase";
import type { Provider, UserId } from "@backend/domain";

export type AuthHandler = {
  login(params: LoginRequest): Promise<{
    token: string;
    refreshToken: string;
  }>;
  refreshToken(token: string): Promise<{
    token: string;
    refreshToken: string;
  }>;
  logout(userId: UserId, refreshToken: string): Promise<{ message: string }>;
  googleLogin(
    params: GoogleLoginRequest,
    clientId: string,
  ): Promise<{
    token: string;
    refreshToken: string;
    userId: UserId;
  }>;
  linkProvider(
    userId: UserId,
    provider: string,
    params: GoogleLoginRequest,
    clientId: string,
  ): Promise<void>;
};

function login(uc: AuthUsecase) {
  return async (params: LoginRequest) => {
    const { accessToken, refreshToken } = await uc.login({
      loginId: params.login_id,
      password: params.password,
    });
    const parsedResponse = authResponseSchema.safeParse({
      token: accessToken,
      refreshToken,
    });
    if (!parsedResponse.success) {
      throw new AppError("loginHandler: failed to parse response", 500);
    }
    return parsedResponse.data;
  };
}

function refreshToken(uc: AuthUsecase) {
  return async (token: string) => {
    const result = await uc.refreshToken(token);
    const parsedResponse = authResponseSchema.safeParse({
      token: result.accessToken,
      refreshToken: result.refreshToken,
    });
    if (!parsedResponse.success) {
      throw new AppError("refreshTokenHandler: failed to parse response", 500);
    }
    return {
      token: parsedResponse.data.token,
      refreshToken: parsedResponse.data.refreshToken,
    };
  };
}

function logout(uc: AuthUsecase) {
  return async (userId: UserId, refreshToken: string) => {
    await uc.logout(userId, refreshToken);
    return { message: "success" };
  };
}

function googleLogin(uc: AuthUsecase) {
  return async (params: GoogleLoginRequest, clientId: string) => {
    const result = await uc.loginWithProvider(
      "google",
      params.credential,
      clientId,
    );
    const userId = result.userId ? createUserId(result.userId) : undefined;
    if (!userId) {
      throw new AppError("googleLoginHandler: userId not found", 500);
    }
    return {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      userId,
    };
  };
}

function linkProvider(uc: AuthUsecase) {
  return async (
    userId: UserId,
    provider: Provider,
    params: GoogleLoginRequest,
    clientId: string,
  ) => {
    await uc.linkProvider(userId, provider, params.credential, clientId);
  };
}

export function newAuthHandler(uc: AuthUsecase): AuthHandler {
  return {
    login: login(uc),
    refreshToken: refreshToken(uc),
    logout: logout(uc),
    googleLogin: googleLogin(uc),
    linkProvider: linkProvider(uc),
  };
}
