import { z } from "zod";

import { UserIdSchema } from "../user";

import { TaskIdSchema } from "./taskId";

export const NewTaskSchema = z.object({
  status: z.literal("new"),
  id: TaskIdSchema,
  userId: UserIdSchema,
  title: z.string(),
  done: z.boolean(),
  memo: z.string().nullable(),
});
export type NewTask = z.infer<typeof NewTaskSchema>;

export const PersistedTaskSchema = z.object({
  status: z.literal("persisted"),
  id: TaskIdSchema,
  userId: UserIdSchema,
  title: z.string(),
  done: z.boolean(),
  memo: z.string().nullable(),
  due: z.string().date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PersistedTask = z.infer<typeof PersistedTaskSchema>;

export const TaskSchema = z.union([NewTaskSchema, PersistedTaskSchema]);
export type Task = z.infer<typeof TaskSchema>;
