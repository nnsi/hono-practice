import { sign } from "hono/jwt";

import {
  type UserId,
  createUserId,
  createUserProviderEntity,
  createUserProviderId,
} from "@backend/domain";
import { AppError, AuthError } from "@backend/error";
import { hashWithSHA256 } from "@backend/lib/hash";
import {
  createRefreshToken,
  validateRefreshToken,
} from "@domain/auth/refreshToken";
import { v7 } from "uuid";

import type { UserRepository } from "../user";
import type { OAuthVerify, OIDCPayload } from "./oauthVerify";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserProviderRepository } from "./userProviderRepository";
import type { Provider } from "@domain/auth/userProvider";
import type { createRemoteJWKSet, jwtVerify as defaultJwtVerify } from "jose";

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
  userId?: string;
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

export function newAuthUsecase<T>(
  userRepo: UserRepository<T>,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
  jwtAudience: string,
  oauthVerifiers: OAuthVerifierMap,
): AuthUsecase {
  return {
    login: login(
      userRepo,
      refreshTokenRepo,
      passwordVerifier,
      jwtSecret,
      jwtAudience,
    ),
    refreshToken: refreshToken(refreshTokenRepo, jwtSecret, jwtAudience),
    logout: logout(refreshTokenRepo),
    loginWithProvider: loginWithProvider(
      userRepo,
      refreshTokenRepo,
      userProviderRepo,
      jwtSecret,
      jwtAudience,
      oauthVerifiers,
    ),
    linkProvider: linkProvider(userProviderRepo, oauthVerifiers),
  };
}

// 各メソッドを個別関数化
function login<T>(
  userRepo: UserRepository<T>,
  refreshTokenRepo: RefreshTokenRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
  jwtAudience: string,
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

    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      user.id,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();

    const refreshTokenEntity = createRefreshToken({
      userId: user.id,
      selector,
      token: await hashWithSHA256(plainRefreshToken),
      expiresAt,
    });
    await refreshTokenRepo.createRefreshToken(refreshTokenEntity);
    const combinedRefreshToken = `${selector}.${plainRefreshToken}`;

    return { accessToken, refreshToken: combinedRefreshToken };
  };
}

function refreshToken(
  refreshTokenRepo: RefreshTokenRepository,
  jwtSecret: string,
  jwtAudience: string,
) {
  return async (combinedToken: string): Promise<AuthOutput> => {
    const storedToken =
      await refreshTokenRepo.getRefreshTokenByToken(combinedToken);
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (!validateRefreshToken(storedToken)) {
      await refreshTokenRepo.revokeRefreshToken(storedToken);
      throw new AuthError("invalid refresh token (validation failed)");
    }

    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      storedToken.userId,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();

    const refreshTokenEntity = createRefreshToken({
      userId: storedToken.userId,
      selector,
      token: await hashWithSHA256(plainRefreshToken),
      expiresAt,
    });
    await refreshTokenRepo.createRefreshToken(refreshTokenEntity);
    const newCombinedRefreshToken = `${selector}.${plainRefreshToken}`;
    await refreshTokenRepo.revokeRefreshToken(storedToken);

    return { accessToken, refreshToken: newCombinedRefreshToken };
  };
}

function logout(refreshTokenRepo: RefreshTokenRepository) {
  return async (userId: UserId, refreshToken: string): Promise<void> => {
    const storedToken =
      await refreshTokenRepo.getRefreshTokenByToken(refreshToken);
    if (!storedToken) throw new AuthError("invalid refresh token");
    if (storedToken.userId !== userId)
      throw new AuthError("unauthorized - token does not belong to user");

    await refreshTokenRepo.revokeRefreshToken(storedToken);
  };
}

function loginWithProvider<T>(
  userRepo: UserRepository<T>,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  jwtSecret: string,
  jwtAudience: string,
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

    const accessToken = await generateAccessToken(
      jwtSecret,
      jwtAudience,
      userId,
    );
    const { selector, plainRefreshToken, expiresAt } = generateRefreshToken();
    const refreshTokenEntity = createRefreshToken({
      userId,
      selector,
      token: await hashWithSHA256(plainRefreshToken),
      expiresAt,
    });
    await refreshTokenRepo.createRefreshToken(refreshTokenEntity);
    const refreshToken = `${selector}.${plainRefreshToken}`;

    return { accessToken, refreshToken, userId };
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
    const existingProvider =
      await userProviderRepo.findUserProviderByIdAndProvider(
        provider,
        providerUserId,
      );
    if (existingProvider) {
      if (existingProvider.userId !== userId) {
        throw new AppError(
          "このアカウントは他のユーザーに紐付けられています",
          400,
        );
      }
      // 同じユーザーが既に連携している場合は、既存のレコードを論理削除
      await userProviderRepo.softDeleteByUserIdAndProvider(userId, provider);
    }

    const userProvider = createUserProviderEntity({
      id: createUserProviderId(),
      userId,
      provider,
      providerId: providerUserId,
      email: payload.email,
      type: "new",
    });

    await userProviderRepo.createUserProvider(userProvider);
  };
}

function generateAccessToken(
  jwtSecret: string,
  jwtAudience: string,
  userId: UserId,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      userId: userId,
      aud: jwtAudience,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    },
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
