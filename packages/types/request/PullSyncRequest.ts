import { z } from "zod";

// Pull同期リクエスト
export const PullSyncRequestSchema = z.object({
  lastSyncTimestamp: z.string().optional(), // 最後の同期時刻（ISO形式）
  entityTypes: z
    .array(z.enum(["activity", "activityLog", "task", "goal"]))
    .optional(), // 同期対象のエンティティタイプ
  limit: z.number().int().min(1).max(1000).default(100), // 取得件数の上限
  cursor: z.string().optional(), // ページネーション用カーソル
});

export type PullSyncRequest = z.infer<typeof PullSyncRequestSchema>;
