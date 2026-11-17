import { z } from "zod";

/**
 * push で受理した行と、サーバーに保存された updatedAt。
 * サーバーは受理時に updatedAt を自分の時刻へ繰り上げるため、クライアントが
 * 送った値とは異なる。
 */
export const SyncedRevisionsSchema = z.array(
  z.object({ id: z.string(), updatedAt: z.date() }),
);

export type SyncedRevision = z.infer<typeof SyncedRevisionsSchema>[number];
