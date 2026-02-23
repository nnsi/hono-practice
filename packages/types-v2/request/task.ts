import { z } from "zod"

export const UpsertTaskRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  doneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  memo: z.string(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const SyncTasksRequestSchema = z.object({
  tasks: z.array(UpsertTaskRequestSchema).max(100),
})

export type UpsertTaskRequest = z.infer<typeof UpsertTaskRequestSchema>
export type SyncTasksRequest = z.infer<typeof SyncTasksRequestSchema>
