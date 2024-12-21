import { validate } from "uuid";

export type ActivityId = string & { readonly __brand: unique symbol };

export function createActivityId(id?: string): ActivityId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }
  return id as ActivityId;
}
