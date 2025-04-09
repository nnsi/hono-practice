import { z } from "zod";

export const loginRequestSchema = z.object({
  login_id: z
    .string()
    .min(1, "ログインIDは必須です")
    .max(100, "ログインIDが長すぎます"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(100, "パスワードが長すぎます"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
