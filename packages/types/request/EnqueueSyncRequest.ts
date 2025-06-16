import { z } from "zod";

export const EnqueueSyncRequestSchema = z.object({
  operations: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      operation: z.enum(["create", "update", "delete"]),
      payload: z.record(z.any()),
      timestamp: z.string(),
      sequenceNumber: z.number().int().min(0),
    })
  ),
});

export type EnqueueSyncRequest = z.infer<typeof EnqueueSyncRequestSchema>;