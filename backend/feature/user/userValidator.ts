import { z } from "zod";

export const UserCreateSchema = z.object({
  loginId: z.string(),
  password: z.string(),
  name: z.string().optional(),
});

export type UserCreateParams = z.infer<typeof UserCreateSchema>;
