import { z } from "zod";

export const loginRequestSchema = z.object({
  login_id: z.string(),
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
