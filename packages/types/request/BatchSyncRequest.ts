import { z } from "zod";

// 同期対象エンティティの型
export const SyncEntityTypeSchema = z.enum([
  "activity",
  "activityLog",
  "task",
  "goal",
]);

// 同期操作の型
export const SyncOperationSchema = z.enum(["create", "update", "delete"]);

// 個別の同期アイテム
export const SyncItemSchema = z.object({
  clientId: z.string(), // クライアント側で生成したID（重複防止用）
  entityType: SyncEntityTypeSchema,
  entityId: z.string(),
  operation: SyncOperationSchema,
  payload: z.record(z.any()), // エンティティのデータ
  timestamp: z.string(), // ISO 8601形式
  sequenceNumber: z.number().int().min(0), // クライアント側のシーケンス番号
  version: z.number().int().min(0).optional(), // 楽観的ロック用のバージョン番号
});

// バッチ同期リクエスト
export const BatchSyncRequestSchema = z.object({
  items: z.array(SyncItemSchema),
  lastSyncTimestamp: z.string().optional(), // 前回の同期タイムスタンプ
  clientVersion: z.string().optional(), // クライアントアプリのバージョン
});

export type SyncEntityType = z.infer<typeof SyncEntityTypeSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncItem = z.infer<typeof SyncItemSchema>;
export type BatchSyncRequest = z.infer<typeof BatchSyncRequestSchema>;
