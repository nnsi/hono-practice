import { z } from "zod";

export const LoginResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
