import { validate } from "uuid";

export type UserId = string & { readonly __brand: unique symbol };

export function createUserId(id?: string): UserId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }
  return id as UserId;
}
