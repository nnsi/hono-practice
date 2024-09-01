import { z } from "zod";

export const createUserRequestSchema = z.object({
  name: z.string().optional(),
  login_id: z.string().min(1, "ログインIDは必須です"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
