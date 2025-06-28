import { z } from "zod";

// ID型の定義
export const syncMetadataIdSchema = z.string().brand<"SyncMetadataId">();
export type SyncMetadataId = z.infer<typeof syncMetadataIdSchema>;

// 同期状態の定義
export const syncStatusSchema = z.enum([
  "pending",
  "syncing",
  "synced",
  "failed",
]);
export type SyncStatus = z.infer<typeof syncStatusSchema>;

// SyncMetadataエンティティのスキーマ
export const syncMetadataEntitySchema = z.object({
  id: syncMetadataIdSchema,
  userId: z.string(),
  entityType: z.string(), // "activity", "task" など
  entityId: z.string(),
  lastSyncedAt: z.date().nullable(),
  status: syncStatusSchema,
  errorMessage: z.string().nullable(),
  retryCount: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SyncMetadataEntity = z.infer<typeof syncMetadataEntitySchema>;

// ファクトリ関数
export function createSyncMetadataEntity(params: {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  lastSyncedAt?: Date | null;
  status?: SyncStatus;
  errorMessage?: string | null;
  retryCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}): SyncMetadataEntity {
  const now = new Date();

  return syncMetadataEntitySchema.parse({
    id: params.id,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    lastSyncedAt: params.lastSyncedAt ?? null,
    status: params.status ?? "pending",
    errorMessage: params.errorMessage ?? null,
    retryCount: params.retryCount ?? 0,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  });
}

// ヘルパー関数
export function canRetrySync(
  metadata: SyncMetadataEntity,
  maxRetries = 3,
): boolean {
  return metadata.status === "failed" && metadata.retryCount < maxRetries;
}

export function markAsSyncing(
  metadata: SyncMetadataEntity,
): SyncMetadataEntity {
  return {
    ...metadata,
    status: "syncing",
    updatedAt: new Date(),
  };
}

export function markAsSynced(metadata: SyncMetadataEntity): SyncMetadataEntity {
  return {
    ...metadata,
    status: "synced",
    lastSyncedAt: new Date(),
    errorMessage: null,
    retryCount: 0,
    updatedAt: new Date(),
  };
}

export function markAsFailed(
  metadata: SyncMetadataEntity,
  errorMessage: string,
): SyncMetadataEntity {
  return {
    ...metadata,
    status: "failed",
    errorMessage,
    retryCount: metadata.retryCount + 1,
    updatedAt: new Date(),
  };
}
