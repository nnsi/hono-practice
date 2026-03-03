import { z } from "zod";

const ActivityLogRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activityId: z.string(),
  activityKindId: z.string().nullable(),
  quantity: z.number().nullable(),
  memo: z.string().nullable(),
  date: z.string(),
  time: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const SyncResultSchema = z.object({
  syncedIds: z.array(z.string()),
  serverWins: z.array(ActivityLogRowSchema),
  skippedIds: z.array(z.string()),
});

export const GetActivityLogsV2ResponseSchema = z.object({
  logs: z.array(ActivityLogRowSchema),
});

export const SyncActivityLogsV2ResponseSchema = SyncResultSchema;

export type SyncActivityLogsResponse = z.infer<
  typeof SyncActivityLogsV2ResponseSchema
>;

export type GetActivityLogsV2Response = z.infer<
  typeof GetActivityLogsV2ResponseSchema
>;
