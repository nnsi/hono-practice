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
    // 既存の selector を受け取るオプション (再利用しない場合が多いが念のため)
    existingSelector?: string,
  ): Promise<string> => {
    // selector を生成 (または引数で受け取る)
    const selector = existingSelector ?? crypto.randomUUID();
    // トークン本体を生成
    const plainRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);

    // リポジトリには selector と平文トークンを渡す
    await refreshTokenRepo.create({
      userId,
      selector,
      token: plainRefreshToken,
      expiresAt,
    });

    // クライアントには selector と平文トークンを結合して返す
    return `${selector}.${plainRefreshToken}`;
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
      // login 時は新しい selector と token を生成
      const combinedRefreshToken = await generateAndStoreRefreshToken(user.id);

      return {
        accessToken,
        // 結合されたトークンを返す
        refreshToken: combinedRefreshToken,
      };
    },

    async refreshToken(combinedToken: string): Promise<AuthOutput> {
      // Repository に結合済みトークンを渡して検証・取得
      // findByToken 内で selector による検索、ハッシュ比較、有効期限チェックが行われる
      const storedToken = await refreshTokenRepo.findByToken(combinedToken);

      if (!storedToken) {
        // ここで詳細なエラーハンドリングを追加することも可能
        // (例: ログ出力、不正アクセス試行の監視など)
        throw new AuthError("invalid refresh token");
      }

      // ドメイン層のバリデーションは findByToken 内で実施済みの想定だが念のため残す
      // (ただし、findByToken の実装によっては不要になる)
      if (!validateRefreshToken(storedToken)) {
        // revoke は findByToken 内で処理するか、ここで再度実行するか検討
        await refreshTokenRepo.revoke(storedToken.id);
        throw new AuthError("invalid refresh token (validation failed)");
      }

      // 新しいアクセストークンを生成
      const accessToken = await generateAccessToken(storedToken.userId);

      // 新しいリフレッシュトークンを生成・永続化
      // 古いトークンは revoke するため、selector は再生成
      const newCombinedRefreshToken = await generateAndStoreRefreshToken(
        storedToken.userId,
      );

      // 古いリフレッシュトークンを無効化 (IDで revoke)
      // findByToken で既にチェックされているが、念のため revoke するのが安全
      await refreshTokenRepo.revoke(storedToken.id);

      return {
        accessToken,
        refreshToken: newCombinedRefreshToken, // 新しい結合済みトークンを返す
      };
    },

    async logout(userId: UserId): Promise<void> {
      // UserId を受け取る
      // リポジトリの revokeAllByUserId を呼び出し (UserId を渡す)
      await refreshTokenRepo.revokeAllByUserId(userId);
    },
  };
}
