import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import { userIdSchema } from "../user/userSchema";

// リフレッシュトークンのスキーマ定義
export const refreshTokenSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema,
  selector: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  revokedAt: z.date().nullable(),
  rotatedAt: z.date().nullable(),
  familyId: z.string().uuid().nullable().default(null),
  rotationOperationHash: z.string().nullable().default(null),
  rotationChildId: z.string().uuid().nullable().default(null),
  rotationRecoveryExpiresAt: z.date().nullable().default(null),
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
  familyId: z.string().uuid().optional(),
});

// リフレッシュトークンのエンティティ型
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

// リフレッシュトークンのファクトリ関数（now パラメータ化）
export function createRefreshToken(
  params: RefreshTokenInput,
  now: Date = new Date(),
): RefreshToken {
  const id = v7();
  const parsedToken = refreshTokenSchema.safeParse({
    ...params,
    id,
    familyId: params.familyId ?? id,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    rotatedAt: null,
    deletedAt: null,
  });

  if (!parsedToken.success) {
    throw new DomainValidateError("createRefreshToken: invalid params");
  }

  return parsedToken.data;
}

// リフレッシュトークンの検証関数（now パラメータ化）
export function validateRefreshToken(
  token: RefreshToken,
  now: Date = new Date(),
): boolean {
  return !token.revokedAt && !token.deletedAt && token.expiresAt > now;
}
