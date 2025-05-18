import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { userIdSchema } from "./userId";

const BaseUserSchema = z.object({
  id: userIdSchema,
  name: z.string().nullish(),
  loginId: z.string(),
  password: z.string().nullable(),
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
export type UserInput = z.input<typeof UserSchema>;

export function createUserEntity(params: UserInput): User {
  const parsedEntity = UserSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createUserEntity: invalid params");
  }

  return parsedEntity.data;
}
