import { z } from "zod"

export const UpsertActivityLogRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  activityKindId: z.string().uuid().nullable(),
  quantity: z.number().min(0).nullable(),
  memo: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const SyncActivityLogsRequestSchema = z.object({
  logs: z.array(UpsertActivityLogRequestSchema).max(100),
})

export type UpsertActivityLogRequest = z.infer<typeof UpsertActivityLogRequestSchema>
export type SyncActivityLogsRequest = z.infer<typeof SyncActivityLogsRequestSchema>
