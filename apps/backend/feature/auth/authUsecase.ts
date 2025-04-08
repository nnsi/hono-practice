import { sign } from "hono/jwt";

import { AuthError } from "@backend/error";
import { validateRefreshToken } from "@domain/auth/refreshToken";

import type { UserRepository } from "../user";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";

// アクセストークンの有効期限を15分に設定
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15分（秒単位）

export interface AuthUsecase {
  login(
    loginId: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  logout(userId: string): Promise<void>;
}

export function newAuthUsecase(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
): AuthUsecase {
  return {
    async login(loginId: string, password: string) {
      const user = await userRepo.getUserByLoginId(loginId);
      if (!user) {
        throw new AuthError("invalid credentials");
      }

      const isValid = await passwordVerifier.compare(password, user.password);
      if (!isValid) {
        throw new AuthError("invalid credentials");
      }

      const now = Math.floor(Date.now() / 1000); // 現在時刻（秒）
      const accessToken = await sign(
        {
          userId: user.id,
          exp: now + ACCESS_TOKEN_EXPIRES_IN,
        },
        jwtSecret,
        "HS256",
      );

      const plainRefreshToken = crypto.randomUUID();

      await refreshTokenRepo.create({
        userId: user.id,
        token: plainRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken,
        refreshToken: plainRefreshToken,
      };
    },

    async refreshToken(token: string) {
      const storedToken = await refreshTokenRepo.findByToken(token);
      if (!storedToken) {
        throw new Error("invalid refresh token");
      }

      if (!validateRefreshToken(storedToken)) {
        await refreshTokenRepo.revoke(storedToken.id);
        throw new Error("invalid refresh token");
      }

      const now = Math.floor(Date.now() / 1000); // 現在時刻（秒）
      const accessToken = await sign(
        {
          userId: storedToken.userId,
          exp: now + ACCESS_TOKEN_EXPIRES_IN,
        },
        jwtSecret,
        "HS256",
      );

      const newPlainRefreshToken = crypto.randomUUID();

      await refreshTokenRepo.create({
        userId: storedToken.userId,
        token: newPlainRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await refreshTokenRepo.revoke(storedToken.id);

      return {
        accessToken,
        refreshToken: newPlainRefreshToken,
      };
    },

    async logout(userId: string): Promise<void> {
      await refreshTokenRepo.revokeAllByUserId(userId);
    },
  };
}
