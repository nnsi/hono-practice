import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const loginRequestSchema = z.object({
  login_id: z
    .string()
    .min(1, "validation:loginIdRequired")
    .max(V.LOGIN_ID_MAX, "validation:loginIdTooLong"),
  password: z
    .string()
    .min(V.PASSWORD_MIN, "validation:passwordMin8")
    .max(V.PASSWORD_MAX, "validation:passwordTooLong"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
