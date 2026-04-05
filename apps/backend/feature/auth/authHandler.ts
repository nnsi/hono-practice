import type { RefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import type { Provider } from "@packages/domain/auth/userProviderSchema";
import type { User } from "@packages/domain/user/userSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import type { LoginRequest } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

import { AppError } from "../../error";
import type { AuthUsecase, OAuthConsents } from "./authUsecase";

type GetUserById = (userId: UserId) => Promise<User>;

type OAuthCredential = { credential: string; consents?: OAuthConsents };

type ProviderLoginResult = {
  token: string;
  refreshToken: string;
  userId: UserId;
};

type ProviderLoginWithUserResult = {
  user: User;
  token: string;
  refreshToken: string;
};

export type AuthHandler = {
  login(params: LoginRequest): Promise<{ token: string; refreshToken: string }>;
  refreshToken(token: string): Promise<{ token: string; refreshToken: string }>;
  fetchRefreshToken(token: string): Promise<RefreshToken>;
  rotateRefreshToken(
    storedToken: RefreshToken,
    fireAndForgetFn?: (p: Promise<unknown>) => void,
  ): Promise<{ token: string; refreshToken: string }>;
  logout(userId: UserId, refreshToken: string): Promise<{ message: string }>;
  googleLogin(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginResult>;
  googleLoginWithUser(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginWithUserResult>;
  appleLogin(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginResult>;
  appleLoginWithUser(
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginWithUserResult>;
  linkProvider(
    userId: UserId,
    provider: Provider,
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<void>;
};

function login(uc: AuthUsecase) {
  return async (params: LoginRequest) => {
    const { accessToken, refreshToken } = await uc.login({
      loginId: params.login_id,
      password: params.password,
    });
    const parsed = authResponseSchema.safeParse({
      token: accessToken,
      refreshToken,
    });
    if (!parsed.success) {
      throw new AppError("loginHandler: failed to parse response", 500);
    }
    return parsed.data;
  };
}

function providerLogin(uc: AuthUsecase, provider: Provider) {
  return async (
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginResult> => {
    const result = await uc.loginWithProvider(
      provider,
      params.credential,
      clientId,
      params.consents,
    );
    const userId = result.userId ? createUserId(result.userId) : undefined;
    if (!userId) {
      throw new AppError(`${provider}LoginHandler: userId not found`, 500);
    }
    return {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      userId,
    };
  };
}

function providerLoginWithUser(
  loginFn: ReturnType<typeof providerLogin>,
  getUserById?: GetUserById,
) {
  return async (
    params: OAuthCredential,
    clientId: string | string[],
  ): Promise<ProviderLoginWithUserResult> => {
    const { token, refreshToken, userId } = await loginFn(params, clientId);
    if (!getUserById) {
      throw new AppError("getUserById is not configured", 500);
    }
    const user = await getUserById(userId);
    return { user, token, refreshToken };
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

function parseAuthResponse(result: {
  accessToken: string;
  refreshToken: string;
}) {
  const parsed = authResponseSchema.safeParse({
    token: result.accessToken,
    refreshToken: result.refreshToken,
  });
  if (!parsed.success) {
    throw new AppError("failed to parse auth response", 500);
  }
  return { token: parsed.data.token, refreshToken: parsed.data.refreshToken };
}

export function newAuthHandler(
  uc: AuthUsecase,
  getUserById?: GetUserById,
): AuthHandler {
  const googleLoginFn = providerLogin(uc, "google");
  const appleLoginFn = providerLogin(uc, "apple");
  return {
    login: login(uc),
    refreshToken: async (token) =>
      parseAuthResponse(await uc.refreshToken(token)),
    fetchRefreshToken: (token) => uc.fetchRefreshToken(token),
    rotateRefreshToken: async (storedToken, fireAndForgetFn) =>
      parseAuthResponse(
        await uc.rotateRefreshToken(storedToken, fireAndForgetFn),
      ),
    logout: async (userId, refreshToken) => {
      await uc.logout(userId, refreshToken);
      return { message: "success" };
    },
    googleLogin: googleLoginFn,
    googleLoginWithUser: providerLoginWithUser(googleLoginFn, getUserById),
    appleLogin: appleLoginFn,
    appleLoginWithUser: providerLoginWithUser(appleLoginFn, getUserById),
    linkProvider: linkProvider(uc),
  };
}
