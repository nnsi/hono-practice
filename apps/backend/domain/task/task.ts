import { z } from "zod";

import { userIdSchema } from "../user";

import { taskIdSchema } from "./taskId";

const BaseTaskSchema = z.object({
  id: taskIdSchema,
  userId: userIdSchema,
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
