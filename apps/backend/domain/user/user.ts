import { z } from "zod";

import { userIdSchema } from "./userId";

const BaseUserSchema = z.object({
  id: userIdSchema,
  name: z.string().nullable(),
  loginId: z.string(),
  password: z.string(),
});

const NewUserSchema = BaseUserSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedUserSchema = BaseUserSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const UserSchema = z.discriminatedUnion("type", [
  NewUserSchema,
  PersistedUserSchema,
]);
export type User = z.infer<typeof UserSchema>;
