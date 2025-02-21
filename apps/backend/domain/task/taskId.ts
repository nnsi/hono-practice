import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const TaskIdSchema = z.string().uuid().brand<"TaskId">();

export type TaskId = z.infer<typeof TaskIdSchema>;

export function createTaskId(id?: string): TaskId {
  const taskId = id ?? v7();

  const parsedId = TaskIdSchema.safeParse(taskId);
  if (parsedId.error) {
    throw new DomainValidateError("createTaskId: Invalid id");
  }

  return parsedId.data;
}
