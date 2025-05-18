import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const userProviderIdSchema = z.string().uuid().brand<"UserProviderId">();

export type UserProviderId = z.infer<typeof userProviderIdSchema>;

export function createUserProviderId(id?: string): UserProviderId {
  const userProviderId = id ?? v7();

  const parsedId = userProviderIdSchema.safeParse(userProviderId);
  if (!parsedId.success) {
    throw new DomainValidateError("createUserProviderId: Invalid id");
  }

  return parsedId.data;
}
