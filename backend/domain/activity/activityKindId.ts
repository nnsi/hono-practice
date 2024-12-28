import { v7, validate } from "uuid";

export type ActivityKindId = string & { readonly __brand: unique symbol };

export function createActivityKindId(id?: string): ActivityKindId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }

  const activityKindId = id ?? v7();

  return activityKindId as ActivityKindId;
}
