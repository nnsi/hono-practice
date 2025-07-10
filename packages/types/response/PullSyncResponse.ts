import { z } from "zod";

// エンティティの変更情報
export const EntityChangeSchema = z.object({
  entityType: z.enum(["activity", "activityLog", "task", "goal"]),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  data: z.record(z.any()).optional(), // 削除の場合はデータなし
  updatedAt: z.string(), // ISO形式の日時
});

// Pull同期レスポンス
export const PullSyncResponseSchema = z.object({
  changes: z.array(EntityChangeSchema), // エンティティの変更リスト
  syncTimestamp: z.string(), // 同期時点のタイムスタンプ
  hasMore: z.boolean(), // さらに変更があるかどうか
  nextCursor: z.string().optional(), // 次のページ取得用カーソル
});

export type EntityChange = z.infer<typeof EntityChangeSchema>;
export type PullSyncResponse = z.infer<typeof PullSyncResponseSchema>;
