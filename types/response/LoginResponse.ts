import { z } from "zod";

export const LoginResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
