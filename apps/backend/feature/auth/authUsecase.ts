import { sign } from "hono/jwt";

import {
  type UserId,
  createUserId,
  createUserProviderEntity,
  createUserProviderId,
} from "@backend/domain";
import { AuthError, AppError } from "@backend/error";
import { validateRefreshToken } from "@domain/auth/refreshToken";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { v7 } from "uuid";

import type { PasswordVerifier } from "./passwordVerifier";
import type { UserRepository } from "../user";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserProviderRepository } from "./userProviderRepository";
import type { Provider } from "@domain/auth/userProvider";

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

// Google JWKSet URL
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export interface AuthUsecase {
  login(input: LoginInput): Promise<AuthOutput>;
  refreshToken(token: string): Promise<AuthOutput>;
  logout(userId: UserId, refreshToken: string): Promise<void>;
  loginWithProvider(
    provider: Provider,
    credential: string,
    clientId: string,
  ): Promise<AuthOutput>;
}

export function newAuthUsecase(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
): AuthUsecase {
  const GoogleJWKSet = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

  const generateAccessToken = async (userId: UserId): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    return await sign(
      {
        userId: userId,
        exp: now + ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
      jwtSecret,
      "HS256",
    );
  };

  const generateAndStoreRefreshToken = async (
    userId: UserId,
    existingSelector?: string,
  ): Promise<string> => {
    const selector = existingSelector ?? v7();
    const plainRefreshToken = v7();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

    await refreshTokenRepo.create({
      userId,
      selector,
      token: plainRefreshToken,
      expiresAt,
    });

    return `${selector}.${plainRefreshToken}`;
  };

  return {
    async login(input: LoginInput): Promise<AuthOutput> {
      const { loginId, password } = input;
      const user = await userRepo.getUserByLoginId(loginId);

      if (!user) {
        throw new AuthError("invalid credentials");
      }

      if (!user.password) {
        throw new AuthError(
          "invalid credentials - password cannot be null for standard login",
        );
      }

      const isValidPassword = await passwordVerifier.compare(
        password,
        user.password,
      );

      if (!isValidPassword) {
        throw new AuthError("invalid credentials");
      }

      const accessToken = await generateAccessToken(user.id);
      const combinedRefreshToken = await generateAndStoreRefreshToken(user.id);

      return {
        accessToken,
        refreshToken: combinedRefreshToken,
      };
    },

    async refreshToken(combinedToken: string): Promise<AuthOutput> {
      const storedToken = await refreshTokenRepo.findByToken(combinedToken);

      if (!storedToken) {
        throw new AuthError("invalid refresh token");
      }

      if (!validateRefreshToken(storedToken)) {
        await refreshTokenRepo.revoke(storedToken.id);
        throw new AuthError("invalid refresh token (validation failed)");
      }

      const accessToken = await generateAccessToken(storedToken.userId);
      const newCombinedRefreshToken = await generateAndStoreRefreshToken(
        storedToken.userId,
      );

      await refreshTokenRepo.revoke(storedToken.id);

      return {
        accessToken,
        refreshToken: newCombinedRefreshToken,
      };
    },

    async logout(userId: UserId, refreshToken: string): Promise<void> {
      const storedToken = await refreshTokenRepo.findByToken(refreshToken);

      if (!storedToken) {
        throw new AuthError("invalid refresh token");
      }

      if (storedToken.userId !== userId) {
        throw new AuthError("unauthorized - token does not belong to user");
      }

      await refreshTokenRepo.revoke(storedToken.id);
    },

    async loginWithProvider(
      provider: Provider,
      credential: string,
      clientId: string,
    ): Promise<AuthOutput> {
      if (provider !== "google") {
        throw new AppError(`Unsupported provider: ${provider}`, 400);
      }

      let payload: {
        sub?: string;
        email?: string;
        name?: string;
        [key: string]: unknown;
      };
      try {
        const { payload: verifiedPayload } = await jwtVerify(
          credential,
          GoogleJWKSet,
          {
            issuer: "https://accounts.google.com",
            audience: clientId,
          },
        );
        payload = verifiedPayload;

        if (!payload.sub) {
          throw new AuthError(
            "Missing 'sub' (subject) in Google token payload",
          );
        }
        if (!payload.email) {
          throw new AuthError("Missing 'email' in Google token payload");
        }
      } catch (error: any) {
        console.error("Google ID token verification failed:", error.message);
        throw new AuthError(`Failed to verify Google token: ${error.message}`);
      }

      const googleUserId = payload.sub;
      const name = payload.name ?? `User_${googleUserId.substring(0, 8)}`;

      let userId: UserId | undefined = undefined;
      const existingProvider =
        await userProviderRepo.findUserProviderByIdAndProvider(
          provider,
          googleUserId,
        );

      if (existingProvider) {
        userId = existingProvider.userId;
      } else {
        const newUserId = createUserId();
        await userRepo.createUser({
          id: newUserId,
          loginId: `google|${googleUserId}`,
          name: name,
          password: null,
          type: "new",
        });
        userId = newUserId;

        const userProvider = createUserProviderEntity({
          id: createUserProviderId(),
          userId: newUserId,
          provider,
          providerId: googleUserId,
          type: "new",
        });
        await userProviderRepo.createUserProvider(userProvider);
      }

      if (!userId) {
        throw new AppError(
          "Failed to determine user ID during provider login",
          500,
        );
      }

      const accessToken = await generateAccessToken(userId);
      const refreshToken = await generateAndStoreRefreshToken(userId);

      return { accessToken, refreshToken };
    },
  };
}
