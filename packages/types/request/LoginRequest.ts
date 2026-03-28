import { z } from "zod";

export const loginRequestSchema = z.object({
  login_id: z
    .string()
    .min(1, "validation:loginIdRequired")
    .max(100, "validation:loginIdTooLong"),
  password: z
    .string()
    .min(8, "validation:passwordMin8")
    .max(100, "validation:passwordTooLong"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
