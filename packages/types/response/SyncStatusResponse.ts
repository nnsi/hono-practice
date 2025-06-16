import { z } from "zod";

export const SyncStatusResponseSchema = z.object({
  status: z.object({
    pendingCount: z.number(),
    syncingCount: z.number(),
    syncedCount: z.number(),
    failedCount: z.number(),
    totalCount: z.number(),
    syncPercentage: z.number(),
    lastSyncedAt: z.string().nullable(),
  }),
});

export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;