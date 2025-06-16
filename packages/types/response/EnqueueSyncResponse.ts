import { z } from "zod";

export const EnqueueSyncResponseSchema = z.object({
  enqueuedCount: z.number(),
  operations: z.array(
    z.object({
      id: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      operation: z.enum(["create", "update", "delete"]),
      sequenceNumber: z.number(),
    })
  ),
});

export type EnqueueSyncResponse = z.infer<typeof EnqueueSyncResponseSchema>;