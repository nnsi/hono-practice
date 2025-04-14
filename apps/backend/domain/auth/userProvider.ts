import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { userIdSchema } from "../user/userId";

import { userProviderIdSchema } from "./userProviderId";

// Define Provider literal type
export const providerSchema = z.enum(["google"]); // Add other providers if needed
export type Provider = z.infer<typeof providerSchema>;

// Base schema for UserProvider
const BaseUserProviderSchema = z.object({
  id: userProviderIdSchema,
  userId: userIdSchema,
  provider: providerSchema,
  providerId: z.string(),
});

const NewUserProviderSchema = BaseUserProviderSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedUserProviderSchema = BaseUserProviderSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const UserProviderSchema = z.discriminatedUnion("type", [
  NewUserProviderSchema,
  PersistedUserProviderSchema,
]);

export type UserProvider = z.infer<typeof UserProviderSchema>;
type UserProviderInput = z.input<typeof UserProviderSchema>;

// Factory function to create UserProvider entity
export function createUserProviderEntity(
  params: UserProviderInput,
): UserProvider {
  const parsedEntity = UserProviderSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createUserProviderEntity: invalid params");
  }

  return parsedEntity.data;
}
