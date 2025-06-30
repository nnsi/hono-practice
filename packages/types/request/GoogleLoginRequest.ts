import { z } from "zod";

export const googleLoginRequestSchema = z.object({
  credential: z.string(), // Google IDトークン
});

export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
