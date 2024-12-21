import { validate } from "uuid";

export type ActivityLogId = string & { readonly __brand: unique symbol };

export function createActivityLogId(id?: string): ActivityLogId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }
  return id as ActivityLogId;
}
