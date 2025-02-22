import { z } from "zod";

import { UserIdSchema } from "../user";

import { TaskIdSchema } from "./taskId";

const BaseTaskSchema = z.object({
  id: TaskIdSchema,
  userId: UserIdSchema,
  title: z.string(),
  done: z.boolean(),
  memo: z.string().nullable(),
  due: z.string().date().nullable().optional(),
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
