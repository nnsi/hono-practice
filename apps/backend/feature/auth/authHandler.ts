import type { Provider, UserId } from "@backend/domain";
import { createUserId } from "@backend/domain/user/userId";
import type { RefreshToken } from "@domain/auth/refreshToken";
import type { GoogleLoginRequest, LoginRequest } from "@dtos/request";
import { authResponseSchema } from "@dtos/response";

import { AppError } from "../../error";
import type { AuthUsecase } from "./authUsecase";

export type AuthHandler = {
  login(params: LoginRequest): Promise<{
    token: string;
    refreshToken: string;
  }>;
  refreshToken(token: string): Promise<{
    token: string;
    refreshToken: string;
  }>;
  /** DB読み取りのみ: トークン取得+バリデーション */
  fetchRefreshToken(token: string): Promise<RefreshToken>;
  /** DB書き込み: JWT生成 + 新トークン作成 + 旧トークン失効 */
  rotateRefreshToken(
    storedToken: RefreshToken,
    fireAndForgetFn?: (p: Promise<unknown>) => void,
  ): Promise<{
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

function fetchRefreshTokenHandler(uc: AuthUsecase) {
  return async (token: string) => {
    return uc.fetchRefreshToken(token);
  };
}

function rotateRefreshTokenHandler(uc: AuthUsecase) {
  return async (
    storedToken: RefreshToken,
    fireAndForgetFn?: (p: Promise<unknown>) => void,
  ) => {
    const result = await uc.rotateRefreshToken(storedToken, fireAndForgetFn);
    const parsedResponse = authResponseSchema.safeParse({
      token: result.accessToken,
      refreshToken: result.refreshToken,
    });
    if (!parsedResponse.success) {
      throw new AppError(
        "rotateRefreshTokenHandler: failed to parse response",
        500,
      );
    }
    return {
      token: parsedResponse.data.token,
      refreshToken: parsedResponse.data.refreshToken,
    };
  };
}

export function newAuthHandler(uc: AuthUsecase): AuthHandler {
  return {
    login: login(uc),
    refreshToken: refreshToken(uc),
    fetchRefreshToken: fetchRefreshTokenHandler(uc),
    rotateRefreshToken: rotateRefreshTokenHandler(uc),
    logout: logout(uc),
    googleLogin: googleLogin(uc),
    linkProvider: linkProvider(uc),
  };
}
