import { sign } from "hono/jwt";

import { AuthError } from "@backend/error";
import { validateRefreshToken } from "@domain/auth/refreshToken";

import type { UserRepository } from "../user";
import type { PasswordVerifier } from "./passwordVerifier";
import type { RefreshTokenRepository } from "./refreshTokenRepository";
import type { UserId } from "@backend/domain"; // UserId をインポート

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
  refreshToken: string; // 平文のリフレッシュトークン
};

export interface AuthUsecase {
  login(input: LoginInput): Promise<AuthOutput>;
  refreshToken(token: string): Promise<AuthOutput>;
  logout(userId: UserId): Promise<void>; // UserId 型を使用
}

export function newAuthUsecase(
  userRepo: UserRepository,
  refreshTokenRepo: RefreshTokenRepository,
  passwordVerifier: PasswordVerifier,
  jwtSecret: string,
): AuthUsecase {
  // --- ヘルパー関数: アクセストークン生成 ---
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

  // --- ヘルパー関数: 新しいリフレッシュトークン生成・永続化 ---
  const generateAndStoreRefreshToken = async (
    userId: UserId,
  ): Promise<string> => {
    const plainRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

    // リポジトリには RefreshTokenInput を渡す
    await refreshTokenRepo.create({
      userId,
      token: plainRefreshToken,
      expiresAt,
    });
    return plainRefreshToken;
  };

  return {
    async login(input: LoginInput): Promise<AuthOutput> {
      const { loginId, password } = input;
      const user = await userRepo.getUserByLoginId(loginId);

      if (!user) {
        throw new AuthError("invalid credentials");
      }

      const isValidPassword = await passwordVerifier.compare(
        password,
        user.password,
      );

      if (!isValidPassword) {
        throw new AuthError("invalid credentials");
      }

      const accessToken = await generateAccessToken(user.id);
      const plainRefreshToken = await generateAndStoreRefreshToken(user.id);

      return {
        accessToken,
        refreshToken: plainRefreshToken,
      };
    },

    async refreshToken(token: string): Promise<AuthOutput> {
      // Repository から RefreshToken ドメインモデルを取得
      const storedToken = await refreshTokenRepo.findByToken(token);
      if (!storedToken) {
        throw new Error("invalid refresh token"); // エラーメッセージは検討の余地あり
      }

      // ドメイン層のバリデーション関数を使用
      if (!validateRefreshToken(storedToken)) {
        // リポジトリの revoke メソッドを呼び出し (IDを渡す)
        await refreshTokenRepo.revoke(storedToken.id);
        throw new Error("invalid refresh token");
      }

      // 新しいアクセストークンを生成
      const accessToken = await generateAccessToken(storedToken.userId);

      // 新しいリフレッシュトークンを生成・永続化
      const newPlainRefreshToken = await generateAndStoreRefreshToken(
        storedToken.userId,
      );

      // 古いリフレッシュトークンを無効化 (IDを渡す)
      await refreshTokenRepo.revoke(storedToken.id);

      return {
        accessToken,
        refreshToken: newPlainRefreshToken,
      };
    },

    async logout(userId: UserId): Promise<void> {
      // UserId を受け取る
      // リポジトリの revokeAllByUserId を呼び出し (UserId を渡す)
      await refreshTokenRepo.revokeAllByUserId(userId);
    },
  };
}
