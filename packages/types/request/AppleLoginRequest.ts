import { z } from "zod";

export const appleLoginRequestSchema = z.object({
  credential: z.string().max(8192), // Apple IDトークン
});

export type AppleLoginRequest = z.infer<typeof appleLoginRequestSchema>;
