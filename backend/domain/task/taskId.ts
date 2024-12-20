import { validate } from "uuid";

export type TaskId = string & { readonly __brand: unique symbol };

export function createTaskId(id?: string): TaskId {
  if (id && !validate(id)) {
    throw new Error("Invalid id");
  }
  return id as TaskId;
}
