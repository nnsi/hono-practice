import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const taskIdSchema = z.string().uuid().brand<"TaskId">();

export type TaskId = z.infer<typeof taskIdSchema>;

export function createTaskId(id?: string): TaskId {
  const taskId = id ?? v7();

  const parsedId = taskIdSchema.safeParse(taskId);
  if (parsedId.error) {
    throw new DomainValidateError("createTaskId: Invalid id");
  }

  return parsedId.data;
}
