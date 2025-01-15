import { DomainValidateError } from "@backend/error";
import { v7, validate } from "uuid";


export type ActivityLogId = string & { readonly __brand: unique symbol };

export function createActivityLogId(id?: string): ActivityLogId {
  if (id && !validate(id)) {
    throw new DomainValidateError("createActivityLogId: Invalid id");
  }

  const activityLogId = id ?? v7();

  return activityLogId as ActivityLogId;
}
