import { sign } from "hono/jwt";

import type { UserId } from "@packages/domain/user/userSchema";
import { v7 } from "uuid";

// Access tokens cannot be individually revoked. Keep the residual risk after
// logout bounded while refresh tokens remain explicitly revocable.
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
// refresh 成功ごとに、最後の利用から90日までセッションを延長する。
// cookie と DB の期限がずれないよう、両方で同じ値を使う。
export const REFRESH_TOKEN_EXPIRES_IN_MS = 90 * 24 * 60 * 60 * 1000;

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
