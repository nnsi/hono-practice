import { DomainValidateError } from "../errors";
import { v7 } from "uuid";
import { z } from "zod";
import { userIdSchema } from "../user/userSchema";

// TaskId
export const taskIdSchema = z.string().uuid().brand<"TaskId">();
export type TaskId = z.infer<typeof taskIdSchema>;

export function createTaskId(id?: string): TaskId {
  const taskId = id ?? v7();

  const parsedId = taskIdSchema.safeParse(taskId);
  if (!parsedId.success) {
    throw new DomainValidateError("createTaskId: Invalid id");
  }

  return parsedId.data;
}

// Task Entity
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
    throw new DomainValidateError("createTaskEntity: invalid params");
  }

  return parsedEntity.data;
}

export function createArchivedTaskEntity(
  params: z.input<typeof ArchivedTaskSchema>,
): ArchivedTask {
  const parsedEntity = ArchivedTaskSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError(
      "createArchivedTaskEntity: invalid params",
    );
  }

  return parsedEntity.data;
}
