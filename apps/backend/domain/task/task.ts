import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { userIdSchema } from "../user";

import { taskIdSchema } from "./taskId";

const BaseTaskSchema = z.object({
  id: taskIdSchema,
  userId: userIdSchema,
  title: z.string(),
  memo: z.string().nullable(),
  startDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  doneDate: z.string().nullish(),
  archivedAt: z.date().nullish(),
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

// アーカイブ済みタスクのスキーマ
const ArchivedTaskSchema = BaseTaskSchema.merge(
  z.object({
    type: z.literal("archived"),
    doneDate: z.string(), // アーカイブ済みタスクは必ず完了済み
    archivedAt: z.date(), // アーカイブ済みタスクは必ずarchivedAtを持つ
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const TaskSchema = z.discriminatedUnion("type", [
  NewTaskSchema,
  PersistedTaskSchema,
  ArchivedTaskSchema,
]);
export type Task = z.infer<typeof TaskSchema>;
export type ArchivedTask = z.infer<typeof ArchivedTaskSchema>;
type TaskInput = z.input<typeof TaskSchema>;

export function createTaskEntity(params: TaskInput): Task {
  const parsedEntity = TaskSchema.safeParse(params);
  if (!parsedEntity.success) {
    console.error("Task validation failed:", {
      params,
      errors: parsedEntity.error.errors,
    });
    throw new DomainValidateError("createTaskEntity: invalid params");
  }

  return parsedEntity.data;
}

export function createArchivedTaskEntity(
  params: z.input<typeof ArchivedTaskSchema>,
): ArchivedTask {
  const parsedEntity = ArchivedTaskSchema.safeParse(params);
  if (!parsedEntity.success) {
    console.error("ArchivedTask validation failed:", {
      params,
      errors: parsedEntity.error.errors,
    });
    throw new DomainValidateError("createArchivedTaskEntity: invalid params");
  }

  return parsedEntity.data;
}
