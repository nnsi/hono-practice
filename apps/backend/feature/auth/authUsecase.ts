import { sign } from "hono/jwt";

import {
  type UserId,
  createUserId,
  createUserProviderEntity,
  createUserProviderId,
} from "@backend/domain";
import { AuthError, AppError } from "@backend/error";
import { validateRefreshToken } from "@domain/auth/refreshToken";
import { v7 } from "uuid";

import type { PasswordVerifier } from "./passwordVerifier";
import type { UserRepository } from "../user";
import type { OAuthVerify, OIDCPayload } from "./oauthVerify";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserProviderRepository } from "./userProviderRepository";
import type { Provider } from "@domain/auth/userProvider";
import type { jwtVerify as defaultJwtVerify, createRemoteJWKSet } from "jose";

// アクセストークンの有効期限を15分に設定
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
// リフレッシュトークンの有効期限を30日に設定 (ミリ秒)
const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000;

// Usecase の Input/Output 型を定義
export type LoginInput = {
  loginId: string;
  password: string;
};

export type AuthOutput = {
  accessToken: string;
  refreshToken: string;
};

// jwtVerifyの型定義
export type JwtVerifyFn = (
  jwt: string,
  jwks: ReturnType<typeof createRemoteJWKSet>,
  options: Parameters<typeof defaultJwtVerify>[2],
) => ReturnType<typeof defaultJwtVerify>;

export type AuthUsecase = {
  login(input: LoginInput): Promise<AuthOutput>;
  refreshToken(token: string): Promise<AuthOutput>;
  logout(userId: UserId, refreshToken: string): Promise<void>;
  loginWithProvider(
    provider: Provider,
    credential: string,
    clientId: string,
  ): Promise<AuthOutput>;
  linkProvider(
    userId: UserId,
    provider: Provider,
    credential: string,
    clientId: string,
  ): Promise<void>;
};

export type OAuthVerifierMap = Record<Provider, OAuthVerify>;

export function newAuthUsecase(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
  oauthVerifiers: OAuthVerifierMap,
): AuthUsecase {
  return {
    login: login(userRepo, refreshTokenRepo, passwordVerifier, jwtSecret),
    refreshToken: refreshToken(refreshTokenRepo, jwtSecret),
    logout: logout(refreshTokenRepo),
    loginWithProvider: loginWithProvider(
      userRepo,
      refreshTokenRepo,
      userProviderRepo,
      jwtSecret,
      oauthVerifiers,
    ),
    linkProvider: linkProvider(userProviderRepo, oauthVerifiers),
  };
}

// 各メソッドを個別関数化
function login(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
) {
  return async (input: LoginInput): Promise<AuthOutput> => {
    const { loginId, password } = input;
    const user = await userRepo.getUserByLoginId(loginId);
    if (!user) throw new AuthError("invalid credentials");
    if (!user.password)
      throw new AuthError(
        "invalid credentials - password cannot be null for standard login",
      );
    const isValidPassword = await passwordVerifier.compare(
      password,
      user.password,
    );
    if (!isValidPassword) throw new AuthError("invalid credentials");
    const accessToken = await generateAccessToken(jwtSecret, user.id);
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();
    await refreshTokenRepo.create({
      userId: user.id,
      selector,
      token: plainRefreshToken,
      expiresAt,
    });
    const combinedRefreshToken = `${selector}.${plainRefreshToken}`;
    return { accessToken, refreshToken: combinedRefreshToken };
  };
}

function refreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  jwtSecret: string,
) {
  return async (combinedToken: string): Promise<AuthOutput> => {
    const storedToken = await refreshTokenRepo.findByToken(combinedToken);

    if (!storedToken) throw new AuthError("invalid refresh token");
    if (!validateRefreshToken(storedToken)) {
      await refreshTokenRepo.revoke(storedToken.id);
      throw new AuthError("invalid refresh token (validation failed)");
    }

    const accessToken = await generateAccessToken(
      jwtSecret,
      storedToken.userId,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();
    await refreshTokenRepo.create({
      userId: storedToken.userId,
      selector,
      token: plainRefreshToken,
      expiresAt,
    });
    const newCombinedRefreshToken = `${selector}.${plainRefreshToken}`;
    await refreshTokenRepo.revoke(storedToken.id);
    return { accessToken, refreshToken: newCombinedRefreshToken };
  };
}

function logout(refreshTokenRepo: RefreshTokenRepository) {
  return async (userId: UserId, refreshToken: string): Promise<void> => {
    const storedToken = await refreshTokenRepo.findByToken(refreshToken);
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (storedToken.userId !== userId)
      throw new AuthError("unauthorized - token does not belong to user");
    await refreshTokenRepo.revoke(storedToken.id);
  };
}

function loginWithProvider(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  jwtSecret: string,
  oauthVerifiers: OAuthVerifierMap,
) {
  return async (
    provider: Provider,
    credential: string,
    clientId: string,
  ): Promise<AuthOutput> => {
    const verifier = oauthVerifiers[provider];
    if (!verifier) throw new AppError("未対応のプロバイダーです", 400);
    const payload: OIDCPayload = await verifier(credential, clientId);

    if (!payload.sub) throw new AuthError("Missing 'sub' in token payload");
    if (!payload.email) throw new AuthError("Missing 'email' in token payload");

    const providerUserId = payload.sub;
    const name = payload.name ?? `User_${providerUserId.substring(0, 8)}`;

    let userId: UserId | undefined = undefined;

    const existingProvider =
      await userProviderRepo.findUserProviderByIdAndProvider(
        provider,
        providerUserId,
      );

    if (existingProvider) {
      userId = existingProvider.userId;
    } else {
      const newUserId = createUserId();
      await userRepo.createUser({
        id: newUserId,
        loginId: `${provider}|${providerUserId}`,
        name: name,
        password: null,
        type: "new",
      });
      userId = newUserId;
      const userProvider = createUserProviderEntity({
        id: createUserProviderId(),
        userId: newUserId,
        provider,
        providerId: providerUserId,
        type: "new",
      });
      await userProviderRepo.createUserProvider(userProvider);
    }

    if (!userId)
      throw new AppError(
        "Failed to determine user ID during provider login",
        500,
      );

    const accessToken = await generateAccessToken(jwtSecret, userId);
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();
    await refreshTokenRepo.create({
      userId,
      selector,
      token: plainRefreshToken,
      expiresAt,
    });
    const refreshToken = `${selector}.${plainRefreshToken}`;

    return { accessToken, refreshToken };
  };
}

function linkProvider(
  userProviderRepo: UserProviderRepository,
  oauthVerifiers: OAuthVerifierMap,
) {
  return async (
    userId: UserId,
    provider: Provider,
    credential: string,
    clientId: string,
  ): Promise<void> => {
    const verifier = oauthVerifiers[provider];
    if (!verifier) throw new AppError("未対応のプロバイダーです", 400);
    const payload: OIDCPayload = await verifier(credential, clientId);
    if (!payload.sub)
      throw new AuthError("Missing 'sub' (subject) in token payload");
    if (!payload.email) throw new AuthError("Missing 'email' in token payload");
    const providerUserId = payload.sub;
    // 既に他ユーザーに紐付いていないかチェック
    const existingProvider =
      await userProviderRepo.findUserProviderByIdAndProvider(
        provider,
        providerUserId,
      );
    if (existingProvider) {
      if (existingProvider.userId === userId) {
        throw new AppError("すでにこのアカウントは紐付け済みです", 400);
      }
      throw new AppError(
        "このアカウントは他のユーザーに紐付けられています",
        400,
      );
    }
    // 紐付けレコード作成
    const userProvider = createUserProviderEntity({
      id: createUserProviderId(),
      userId,
      provider,
      providerId: providerUserId,
      type: "new",
    });
    await userProviderRepo.createUserProvider(userProvider);
  };
}

// トークン生成関数を外出し
function generateAccessToken(
  jwtSecret: string,
  userId: UserId,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { userId: userId, exp: now + ACCESS_TOKEN_EXPIRES_IN_SECONDS },
    jwtSecret,
    "HS256",
  );
}

function generateRefreshToken(existingSelector?: string): {
  selector: string;
  plainRefreshToken: string;
  expiresAt: Date;
} {
  const selector = existingSelector ?? v7();
  const plainRefreshToken = v7();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
  return { selector, plainRefreshToken, expiresAt };
}
