import { z } from "zod";

export const createUserRequestSchema = z.object({
  name: z.string().optional(),
  loginId: z
    .string()
    .min(1, "validation:loginIdRequired")
    .max(100, "validation:loginIdMax100"),
  password: z
    .string()
    .min(8, "validation:passwordMin8")
    .max(100, "validation:passwordMax100"),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
