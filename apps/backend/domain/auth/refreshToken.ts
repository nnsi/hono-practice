import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

import { userIdSchema } from "../user/userId";

// リフレッシュトークンのスキーマ定義
export const refreshTokenSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema,
  selector: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// リフレッシュトークンの入力スキーマ
export const refreshTokenInputSchema = z.object({
  userId: userIdSchema,
  selector: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
});

// リフレッシュトークンのエンティティ型
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

// リフレッシュトークンのファクトリ関数
export function createRefreshToken(params: RefreshTokenInput): RefreshToken {
  const parsedToken = refreshTokenSchema.safeParse({
    ...params,
    id: v7(),
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
    deletedAt: null,
  });

  if (!parsedToken.success) {
    throw new DomainValidateError("createRefreshToken: invalid params");
  }

  return parsedToken.data;
}

// リフレッシュトークンの検証関数
export function validateRefreshToken(token: RefreshToken): boolean {
  const now = new Date();
  return !token.revokedAt && !token.deletedAt && token.expiresAt > now;
}
