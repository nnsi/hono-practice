import { z } from "zod";

// 同期結果のステータス
export const SyncStatusSchema = z.enum([
  "success",
  "conflict",
  "error",
  "skipped",
]);

// 個別の同期結果
export const SyncResultSchema = z.object({
  clientId: z.string(), // リクエストで送信されたクライアントID
  serverId: z.string().optional(), // サーバー側で生成されたID（createの場合）
  status: SyncStatusSchema,
  error: z.string().optional(), // エラーメッセージ
  message: z.string().optional(), // 情報メッセージ（スキップの理由など）
  conflictData: z.record(z.any()).optional(), // コンフリクト時の現在のサーバーデータ
  version: z.number().int().optional(), // 更新後のバージョン番号
});

// サーバーからクライアントへの変更通知
export const ServerChangeSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.any()),
  timestamp: z.string(),
  version: z.number().int().optional(),
});

// バッチ同期レスポンス
export const BatchSyncResponseSchema = z.object({
  results: z.array(SyncResultSchema), // 各アイテムの同期結果
  serverChanges: z.array(ServerChangeSchema).optional(), // サーバー側の変更
  syncTimestamp: z.string(), // 同期完了時のタイムスタンプ
  nextSyncToken: z.string().optional(), // 次回同期用のトークン
  hasMore: z.boolean(), // さらに同期が必要かどうか
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;
export type ServerChange = z.infer<typeof ServerChangeSchema>;
export type BatchSyncResponse = z.infer<typeof BatchSyncResponseSchema>;
