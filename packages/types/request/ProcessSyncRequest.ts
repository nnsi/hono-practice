import { z } from "zod";

export const ProcessSyncRequestSchema = z.object({
  batchSize: z.number().int().min(1).max(100).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export type ProcessSyncRequest = z.infer<typeof ProcessSyncRequestSchema>;