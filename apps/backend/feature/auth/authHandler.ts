import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { User, UserId } from "@packages/domain/user/userSchema";
import type { LoginRequest } from "@packages/types/request";
import {
  type AuthResponse,
  authResponseSchema,
} from "@packages/types/response";

import { AppError } from "../../error";
import type { UserWithProviders } from "../user/userUsecase";
import type { AuthOutput, AuthUsecase, OAuthConsents } from "./authUsecase";

type GetUserById = (userId: UserId) => Promise<UserWithProviders>;
type EnrichUser = (user: User) => Promise<UserWithProviders>;

type OAuthCredential = { credential: string; consents?: OAuthConsents };

// AuthResponse.refreshToken は schema 上 optional (Web は cookie で受け取る) だが、
// backend では rotation で常に新規 token を発行するため必須として扱う
type AuthSession = AuthResponse & { refreshToken: string };

export type AuthHandler = {
  login(params: LoginRequest): Promise<AuthSession>;
  rotateRefreshToken(combinedToken: string): Promise<AuthSession>;
  logout(userId: UserId, refreshToken: string): Promise<{ message: string }>;
  googleLogin(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<AuthSession>;
  appleLogin(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<AuthSession>;
  linkProvider(
    userId: UserId,
    provider: Provider,
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<void>;
};

function buildSession(
  result: { accessToken: string; refreshToken: string },
  user: UserWithProviders,
): AuthSession {
  const parsed = authResponseSchema.safeParse({
    token: result.accessToken,
    refreshToken: result.refreshToken,
    user,
  });
  if (!parsed.success) {
    throw new AppError("failed to parse auth response", 500);
  }
  return { ...parsed.data, refreshToken: result.refreshToken };
}

// usecase が user を返している場合は enrichUser で 3 並列クエリのみ、
// 返していない場合（provider login の新規ユーザー作成パス等）は getUserById で 4 並列。
async function resolveUser(
  result: AuthOutput,
  getUserById: GetUserById,
  enrichUser: EnrichUser,
): Promise<UserWithProviders> {
  if (result.user) {
    return enrichUser(result.user);
  }
  return getUserById(result.userId);
}

function login(
  uc: AuthUsecase,
  getUserById: GetUserById,
  enrichUser: EnrichUser,
) {
  return async (params: LoginRequest): Promise<AuthSession> => {
    const result = await uc.login({
      loginId: params.login_id,
      password: params.password,
    });
    const user = await resolveUser(result, getUserById, enrichUser);
    return buildSession(result, user);
  };
}

function rotateRefreshToken(
  uc: AuthUsecase,
  getUserById: GetUserById,
  enrichUser: EnrichUser,
) {
  return async (combinedToken: string): Promise<AuthSession> => {
    const result = await uc.rotateRefreshToken(combinedToken);
    const user = await resolveUser(result, getUserById, enrichUser);
    return buildSession(result, user);
  };
}

function providerLogin(
  uc: AuthUsecase,
  provider: Provider,
  getUserById: GetUserById,
  enrichUser: EnrichUser,
) {
  return async (
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<AuthSession> => {
    const result = await uc.loginWithProvider(
      provider,
      params.credential,
      clientId,
      params.consents,
    );
    const user = await resolveUser(result, getUserById, enrichUser);
    return buildSession(result, user);
  };
}

function linkProvider(uc: AuthUsecase) {
  return async (
    userId: UserId,
    provider: Provider,
    params: OAuthCredential,
    clientId: string | string[],
  ) => {
    await uc.linkProvider(userId, provider, params.credential, clientId);
  };
}

export function newAuthHandler(
  uc: AuthUsecase,
  getUserById: GetUserById,
  enrichUser: EnrichUser,
): AuthHandler {
  return {
    login: login(uc, getUserById, enrichUser),
    rotateRefreshToken: rotateRefreshToken(uc, getUserById, enrichUser),
    logout: async (userId, refreshToken) => {
      await uc.logout(userId, refreshToken);
      return { message: "success" };
    },
    googleLogin: providerLogin(uc, "google", getUserById, enrichUser),
    appleLogin: providerLogin(uc, "apple", getUserById, enrichUser),
    linkProvider: linkProvider(uc),
  };
}
