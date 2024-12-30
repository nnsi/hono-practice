import { v7, validate } from "uuid";

import { DomainValidateError } from "@/backend/error";

export type UserId = string & { readonly __brand: unique symbol };

export function createUserId(id?: string): UserId {
  if (id && !validate(id)) {
    throw new DomainValidateError("createUserId: Invalid id");
  }

  const userId = id ?? v7();

  return userId as UserId;
}
