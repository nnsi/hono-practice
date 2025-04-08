import { z } from "zod";

export const createUserRequestSchema = z.object({
  name: z.string().optional(),
  loginId: z
    .string()
    .min(1, "ログインIDは必須です")
    .max(100, "ログインIDは100文字以内で入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(100, "パスワードは100文字以内で入力してください"),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
