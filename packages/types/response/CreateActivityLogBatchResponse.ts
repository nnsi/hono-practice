import { z } from "zod";

const ActivityLogBatchResultSchema = z.object({
  index: z.number(),
  success: z.boolean(),
  activityLogId: z.string().optional(),
  error: z.string().optional(),
});

export const CreateActivityLogBatchResponseSchema = z.object({
  results: z.array(ActivityLogBatchResultSchema),
  summary: z.object({
    total: z.number(),
    succeeded: z.number(),
    failed: z.number(),
  }),
});

export type CreateActivityLogBatchResponse = z.infer<
  typeof CreateActivityLogBatchResponseSchema
>;
