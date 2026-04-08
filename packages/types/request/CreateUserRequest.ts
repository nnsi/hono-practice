import { z } from "zod";

import { VALIDATION as V } from "../validation";
import { consentsSchema } from "./ConsentsRequest";

export const createUserRequestSchema = z.object({
  name: z.string().optional(),
  loginId: z
    .string()
    .min(1, "validation:loginIdRequired")
    .max(V.LOGIN_ID_MAX, "validation:loginIdMax100"),
  password: z
    .string()
    .min(V.PASSWORD_MIN, "validation:passwordMin8")
    .max(V.LOGIN_ID_MAX, "validation:passwordMax100"),
  consents: consentsSchema,
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
