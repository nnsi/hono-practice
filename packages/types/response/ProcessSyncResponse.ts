import { z } from "zod";

export const ProcessSyncResponseSchema = z.object({
  processedCount: z.number(),
  failedCount: z.number(),
  hasMore: z.boolean(),
});

export type ProcessSyncResponse = z.infer<typeof ProcessSyncResponseSchema>;