import { z } from "zod";

// エンティティの変更情報
export const EntityChangeSchema = z.object({
  entityType: z.enum(["activity", "activityLog", "task", "goal"]),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.unknown()), // エンティティのデータ
  timestamp: z.string(), // ISO形式の日時
  version: z.number(), // エンティティのバージョン番号
});

// Pull同期レスポンス
export const PullSyncResponseSchema = z.object({
  changes: z.array(EntityChangeSchema), // エンティティの変更リスト
  hasMore: z.boolean(), // さらに変更があるかどうか
  nextTimestamp: z.string().optional(), // 次のページ取得用のタイムスタンプ
});

export type EntityChange = z.infer<typeof EntityChangeSchema>;
export type PullSyncResponse = z.infer<typeof PullSyncResponseSchema>;
