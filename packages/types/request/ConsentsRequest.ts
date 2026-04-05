import { z } from "zod";

/**
 * サインアップ時の同意記録用スキーマ。
 * - age: 16歳以上であることの確認（必須: true）
 * - terms: ToS バージョン文字列（ISO 日付 YYYY-MM-DD）
 * - privacy: PP バージョン文字列（ISO 日付 YYYY-MM-DD）
 */
export const consentsSchema = z.object({
  age: z.literal(true),
  terms: z.string().date(),
  privacy: z.string().date(),
});

export type Consents = z.infer<typeof consentsSchema>;
