import { z } from "zod";

export const googleLoginRequestSchema = z.object({
  credential: z.string().max(4096), // Google IDトークン
});

export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
