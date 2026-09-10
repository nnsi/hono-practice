import { z } from "zod";

import type { SyncResult } from "./syncResult";

export const serverEntitySchema = z
  .object({ id: z.string() })
  .catchall(z.unknown());
const syncResultSchema = z.object({
  syncedIds: z.array(z.string()),
  skippedIds: z.array(z.string()),
  serverWins: z.array(serverEntitySchema),
  failures: z
    .array(
      z.object({
        id: z.string(),
        code: z.string(),
        message: z.string(),
        retryable: z.boolean(),
      }),
    )
    .optional(),
});
export function parseSyncResult(value: unknown): SyncResult {
  return syncResultSchema.parse(value);
}
