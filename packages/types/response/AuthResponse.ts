import { z } from "zod";

export const authResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
