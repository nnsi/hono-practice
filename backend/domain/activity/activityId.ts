import { v7, validate } from "uuid";

import { DomainValidateError } from "@/backend/error";

export type ActivityId = string & { readonly __brand: unique symbol };

export function createActivityId(id?: string): ActivityId {
  if (id && !validate(id)) {
    throw new DomainValidateError("createActivityId: Invalid id");
  }

  const activityId = id ?? v7();

  return activityId as ActivityId;
}
