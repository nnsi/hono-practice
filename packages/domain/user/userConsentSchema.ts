import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import { userIdSchema } from "./userSchema";

// 同意種別（ToS / PP / 年齢確認）
export const userConsentTypeSchema = z.enum(["terms", "privacy", "age"]);
export type UserConsentType = z.infer<typeof userConsentTypeSchema>;

// UserConsent エンティティ
export const userConsentSchema = z.object({
  id: z.string().uuid(),
  userId: userIdSchema,
  type: userConsentTypeSchema,
  /** ToS/PP のバージョン識別子（ISO日付）。年齢確認の場合は null。 */
  version: z.string().nullable(),
  confirmedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 新規作成時の入力スキーマ
export const userConsentInputSchema = z.object({
  userId: userIdSchema,
  type: userConsentTypeSchema,
  version: z.string().nullable(),
});

export type UserConsent = z.infer<typeof userConsentSchema>;
export type UserConsentInput = z.infer<typeof userConsentInputSchema>;

/**
 * UserConsent エンティティを生成する（id と各タイムスタンプを自動付与）。
 * now を引数化してテスト容易性を確保する。
 */
export function createUserConsent(
  params: UserConsentInput,
  now: Date = new Date(),
): UserConsent {
  const parsed = userConsentSchema.safeParse({
    ...params,
    id: v7(),
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  if (!parsed.success) {
    throw new DomainValidateError("createUserConsent: invalid params");
  }

  return parsed.data;
}
