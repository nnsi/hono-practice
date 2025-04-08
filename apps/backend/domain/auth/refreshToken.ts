import { z } from "zod";

// リフレッシュトークンのスキーマ定義
export const refreshTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// リフレッシュトークンの入力スキーマ
export const refreshTokenInputSchema = z.object({
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
});

// リフレッシュトークンのエンティティ型
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

// リフレッシュトークンのファクトリ関数
export function createRefreshToken(input: RefreshTokenInput): RefreshToken {
  const now = new Date();
  const parsed = refreshTokenInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid refresh token input");
  }

  return {
    id: crypto.randomUUID(),
    userId: parsed.data.userId,
    token: parsed.data.token,
    expiresAt: parsed.data.expiresAt,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

// リフレッシュトークンの検証関数
export function validateRefreshToken(token: RefreshToken): boolean {
  const now = new Date();
  return !token.revokedAt && !token.deletedAt && token.expiresAt > now;
}
