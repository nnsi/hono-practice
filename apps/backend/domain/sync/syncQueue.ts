import { z } from "zod";

// ID型の定義
export const syncQueueIdSchema = z.string().brand<"SyncQueueId">();
export type SyncQueueId = z.infer<typeof syncQueueIdSchema>;

// 操作種別の定義
export const syncOperationSchema = z.enum(["create", "update", "delete"]);
export type SyncOperation = z.infer<typeof syncOperationSchema>;

// SyncQueueエンティティのスキーマ
export const syncQueueEntitySchema = z.object({
  id: syncQueueIdSchema,
  userId: z.string(),
  entityType: z.string(), // "activity", "task" など
  entityId: z.string(),
  operation: syncOperationSchema,
  payload: z.record(z.any()), // エンティティのデータ
  timestamp: z.date(), // クライアントでの操作時刻
  sequenceNumber: z.number().int().min(0), // 順序保証のための番号
  createdAt: z.date(),
});

export type SyncQueueEntity = z.infer<typeof syncQueueEntitySchema>;

// ファクトリ関数
export function createSyncQueueEntity(params: {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, any>;
  timestamp: Date;
  sequenceNumber: number;
  createdAt?: Date;
}): SyncQueueEntity {
  return syncQueueEntitySchema.parse({
    id: params.id,
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    operation: params.operation,
    payload: params.payload,
    timestamp: params.timestamp,
    sequenceNumber: params.sequenceNumber,
    createdAt: params.createdAt ?? new Date(),
  });
}

// キューアイテムのバッチ処理用の型
export type SyncQueueBatch = {
  items: SyncQueueEntity[];
  totalCount: number;
  hasMore: boolean;
};

// ヘルパー関数
export function sortBySequence(items: SyncQueueEntity[]): SyncQueueEntity[] {
  return [...items].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

export function groupByEntityType(
  items: SyncQueueEntity[],
): Record<string, SyncQueueEntity[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.entityType]) {
        acc[item.entityType] = [];
      }
      acc[item.entityType].push(item);
      return acc;
    },
    {} as Record<string, SyncQueueEntity[]>,
  );
}

export function isConflictingOperation(
  op1: SyncQueueEntity,
  op2: SyncQueueEntity,
): boolean {
  // 同じエンティティに対する操作の競合をチェック
  return (
    op1.entityType === op2.entityType &&
    op1.entityId === op2.entityId &&
    op1.sequenceNumber !== op2.sequenceNumber
  );
}

// 重複チェック用の型
export type DuplicateCheckResult = {
  isDuplicate: boolean;
  conflictingOperations?: SyncQueueEntity[];
};

export function checkForDuplicates(
  newOperation: Pick<
    SyncQueueEntity,
    "entityType" | "entityId" | "timestamp" | "operation"
  >,
  existingOperations: SyncQueueEntity[],
): DuplicateCheckResult {
  // タイムスタンプの許容誤差（ミリ秒）
  const TIMESTAMP_TOLERANCE_MS = 1000;

  const conflicts = existingOperations.filter((existing) => {
    const isSameEntity =
      existing.entityType === newOperation.entityType &&
      existing.entityId === newOperation.entityId;

    const isSameOperation = existing.operation === newOperation.operation;

    const timeDiff = Math.abs(
      existing.timestamp.getTime() - newOperation.timestamp.getTime(),
    );
    const isWithinTolerance = timeDiff <= TIMESTAMP_TOLERANCE_MS;

    return isSameEntity && isSameOperation && isWithinTolerance;
  });

  return {
    isDuplicate: conflicts.length > 0,
    conflictingOperations: conflicts.length > 0 ? conflicts : undefined,
  };
}
