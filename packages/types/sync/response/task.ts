import { z } from "zod";

const TaskRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  doneDate: z.string().nullable(),
  memo: z.string().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const GetTasksV2ResponseSchema = z.object({
  tasks: z.array(TaskRowSchema),
});

export const SyncTasksV2ResponseSchema = z.object({
  syncedIds: z.array(z.string()),
  serverWins: z.array(TaskRowSchema),
  skippedIds: z.array(z.string()),
});

export type SyncTasksResponse = z.infer<typeof SyncTasksV2ResponseSchema>;

export type GetTasksV2Response = z.infer<typeof GetTasksV2ResponseSchema>;
