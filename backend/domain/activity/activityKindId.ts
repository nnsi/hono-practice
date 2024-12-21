import { validate } from "uuid";

export type ActivityKindId = string & { readonly __brand: unique symbol };

export function createActivityKindId(id?: string): ActivityKindId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }
  return id as ActivityKindId;
}
