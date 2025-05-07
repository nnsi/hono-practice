import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { userIdSchema } from "../user";

import { taskIdSchema } from "./taskId";

const BaseTaskSchema = z.object({
  id: taskIdSchema,
  userId: userIdSchema,
  title: z.string(),
  memo: z.string().nullable(),
  startDate: z.string().date().nullish(),
  dueDate: z.string().date().nullish(),
  doneDate: z.string().date().nullish(),
});

const NewTaskSchema = BaseTaskSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedTaskSchema = BaseTaskSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const TaskSchema = z.discriminatedUnion("type", [
  NewTaskSchema,
  PersistedTaskSchema,
]);
export type Task = z.infer<typeof TaskSchema>;
type TaskInput = z.input<typeof TaskSchema>;

export function createTaskEntity(params: TaskInput): Task {
  const parsedEntity = TaskSchema.safeParse(params);
  if (parsedEntity.error) {
    throw new DomainValidateError("createTaskEntity: invalid params");
  }

  return parsedEntity.data;
}
