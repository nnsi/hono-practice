import { z } from "zod";

import { dateStringSchema } from "../../dateSchemas";

export const UpsertActivityLogRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  activityKindId: z.string().uuid().nullable(),
  quantity: z.number().min(0).nullable(),
  memo: z.string().max(10_000),
  date: dateStringSchema,
  taskId: z.string().uuid().nullish(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const SyncActivityLogsRequestSchema = z.object({
  logs: z.array(UpsertActivityLogRequestSchema).max(100),
});

export type UpsertActivityLogRequest = z.infer<
  typeof UpsertActivityLogRequestSchema
>;
export type SyncActivityLogsRequest = z.infer<
  typeof SyncActivityLogsRequestSchema
>;
