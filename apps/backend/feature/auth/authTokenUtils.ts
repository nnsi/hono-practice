import { sign } from "hono/jwt";

import type { UserId } from "@packages/domain/user/userSchema";
import { v7 } from "uuid";

// アクセストークンの有効期限を60分に設定
// (refresh token rotation の頻度を下げ、grace race の発生機会を減らす)
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;
// リフレッシュトークンの有効期限を30日に設定 (ミリ秒)
const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000;

export function generateAccessToken(
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

export function generateRefreshToken(existingSelector?: string): {
  selector: string;
  plainRefreshToken: string;
  expiresAt: Date;
} {
  const selector = existingSelector ?? v7();
  const plainRefreshToken = v7();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
  return { selector, plainRefreshToken, expiresAt };
}
