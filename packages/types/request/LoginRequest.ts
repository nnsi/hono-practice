import { z } from "zod";

export const loginRequestSchema = z.object({
  login_id: z.string().min(1, "ログインIDは必須です"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
