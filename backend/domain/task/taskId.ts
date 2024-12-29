import { v7, validate } from "uuid";

export type TaskId = string & { readonly __brand: unique symbol };

export function createTaskId(id?: string): TaskId {
  if (id && !validate(id)) {
    throw new Error("Invalid id:" + id);
  }

  const taskId = id ?? v7();

  return taskId as TaskId;
}
