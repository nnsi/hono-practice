import {
  canRetrySync,
  groupByEntityType,
  markAsFailed,
} from "@backend/domain/sync";
import { UnexpectedError } from "@backend/error";

import type { SyncRepository } from "./syncRepository";
import type {
  DuplicateCheckResult,
  SyncQueueBatch,
  SyncQueueEntity,
  SyncQueueId,
} from "@backend/domain/sync";

export type SyncUsecase = {
  checkDuplicates(
    userId: string,
    operations: Array<{
      entityType: string;
      entityId: string;
      timestamp: Date;
      operation: "create" | "update" | "delete";
    }>
  ): Promise<DuplicateCheckResult[]>;
  getSyncStatus(userId: string): Promise<{
    pendingCount: number;
    syncingCount: number;
    syncedCount: number;
    failedCount: number;
    lastSyncedAt: Date | null;
    totalCount: number;
    syncPercentage: number;
  }>;
  processSyncQueue(
    userId: string,
    options?: {
      batchSize?: number;
      maxRetries?: number;
    }
  ): Promise<{
    processedCount: number;
    failedCount: number;
    hasMore: boolean;
  }>;
  enqueueSyncOperations(
    operations: Array<{
      userId: string;
      entityType: string;
      entityId: string;
      operation: "create" | "update" | "delete";
      payload: Record<string, any>;
      timestamp: Date;
      sequenceNumber: number;
    }>
  ): Promise<SyncQueueEntity[]>;
};

export function newSyncUsecase(syncRepository: SyncRepository): SyncUsecase {
  return {
    checkDuplicates: checkDuplicates(syncRepository),
    getSyncStatus: getSyncStatus(syncRepository),
    processSyncQueue: processSyncQueue(syncRepository),
    enqueueSyncOperations: enqueueSyncOperations(syncRepository),
  };
}

function checkDuplicates(syncRepository: SyncRepository) {
  return async (
    userId: string,
    operations: Array<{
      entityType: string;
      entityId: string;
      timestamp: Date;
      operation: "create" | "update" | "delete";
    }>
  ): Promise<DuplicateCheckResult[]> => {
    try {
      return await syncRepository.findDuplicatesByTimestamps(userId, operations);
    } catch (error) {
      throw new UnexpectedError("重複チェックに失敗しました", error as Error);
    }
  };
}

function getSyncStatus(syncRepository: SyncRepository) {
  return async (userId: string): Promise<{
    pendingCount: number;
    syncingCount: number;
    syncedCount: number;
    failedCount: number;
    lastSyncedAt: Date | null;
    totalCount: number;
    syncPercentage: number;
  }> => {
    try {
      const status = await syncRepository.getSyncStatus(userId);
      const totalCount =
        status.pendingCount +
        status.syncingCount +
        status.syncedCount +
        status.failedCount;

      const syncPercentage =
        totalCount === 0 ? 100 : Math.round((status.syncedCount / totalCount) * 100);

      return {
        ...status,
        totalCount,
        syncPercentage,
      };
    } catch (error) {
      throw new UnexpectedError("同期状況の取得に失敗しました", error as Error);
    }
  };
}

function processSyncQueue(syncRepository: SyncRepository) {
  return async (
    userId: string,
    options?: {
      batchSize?: number;
      maxRetries?: number;
    }
  ): Promise<{
    processedCount: number;
    failedCount: number;
    hasMore: boolean;
  }> => {
    const batchSize = options?.batchSize ?? 50;
    const maxRetries = options?.maxRetries ?? 3;

    try {
      // バッチで同期キューを取得
      const batch = await syncRepository.dequeueSyncBatch(userId, batchSize);

      if (batch.items.length === 0) {
        return {
          processedCount: 0,
          failedCount: 0,
          hasMore: false,
        };
      }

      // エンティティタイプごとにグループ化
      const groupedItems = groupByEntityType(batch.items);

      let processedCount = 0;
      let failedCount = 0;
      const successfulIds: SyncQueueId[] = [];
      const failedItems: Array<{ item: SyncQueueEntity; error: string }> = [];

      // グループごとに処理
      for (const [entityType, items] of Object.entries(groupedItems)) {
        for (const item of items) {
          try {
            // メタデータの状態を「同期中」に更新
            const metadataId = `${userId}-${item.entityType}-${item.entityId}`;
            const metadata = await syncRepository.getMetadataByEntity(
              userId,
              item.entityType,
              item.entityId
            );

            if (metadata) {
              await syncRepository.updateSyncMetadata(
                metadata.id,
                { status: "syncing" }
              );
            }

            // ここで実際のエンティティ固有の同期処理を実行
            // 現在は同期成功とみなす（実際の実装では各エンティティのリポジトリを呼ぶ）
            await simulateSyncOperation(item);

            successfulIds.push(item.id);
            processedCount++;

            // メタデータを「同期済み」に更新
            if (metadata) {
              await syncRepository.updateSyncMetadata(metadata.id, {
                status: "synced",
                lastSyncedAt: new Date(),
                errorMessage: null,
                retryCount: 0,
              });
            }
          } catch (error) {
            failedCount++;
            const errorMessage =
              error instanceof Error ? error.message : "不明なエラー";
            failedItems.push({ item, error: errorMessage });

            // メタデータを「失敗」に更新
            const metadata = await syncRepository.getMetadataByEntity(
              userId,
              item.entityType,
              item.entityId
            );

            if (metadata) {
              const updatedMetadata = markAsFailed(metadata, errorMessage);
              await syncRepository.updateSyncMetadata(metadata.id, {
                status: updatedMetadata.status,
                errorMessage: updatedMetadata.errorMessage,
                retryCount: updatedMetadata.retryCount,
              });

              // リトライ可能でない場合はキューから削除
              if (!canRetrySync(updatedMetadata, maxRetries)) {
                await syncRepository.deleteQueueItems([item.id]);
              }
            }
          }
        }
      }

      // 成功したアイテムをキューから削除
      if (successfulIds.length > 0) {
        await syncRepository.deleteQueueItems(successfulIds);
      }

      return {
        processedCount,
        failedCount,
        hasMore: batch.hasMore,
      };
    } catch (error) {
      throw new UnexpectedError("同期キューの処理に失敗しました", error as Error);
    }
  };
}

function enqueueSyncOperations(syncRepository: SyncRepository) {
  return async (
    operations: Array<{
      userId: string;
      entityType: string;
      entityId: string;
      operation: "create" | "update" | "delete";
      payload: Record<string, any>;
      timestamp: Date;
      sequenceNumber: number;
    }>
  ): Promise<SyncQueueEntity[]> => {
    try {
      // 重複チェック
      const duplicateChecks = await syncRepository.findDuplicatesByTimestamps(
        operations[0].userId,
        operations.map((op) => ({
          entityType: op.entityType,
          entityId: op.entityId,
          timestamp: op.timestamp,
          operation: op.operation,
        }))
      );

      // 重複していない操作のみエンキュー
      const nonDuplicateOps = operations.filter(
        (_, index) => !duplicateChecks[index].isDuplicate
      );

      if (nonDuplicateOps.length === 0) {
        return [];
      }

      return await syncRepository.enqueueSync(nonDuplicateOps);
    } catch (error) {
      throw new UnexpectedError("同期操作のエンキューに失敗しました", error as Error);
    }
  };
}

// 実際の同期処理をシミュレート（実装時は各エンティティのリポジトリを呼ぶ）
async function simulateSyncOperation(item: SyncQueueEntity): Promise<void> {
  // 実際の実装では、entityTypeに応じて適切なリポジトリのメソッドを呼ぶ
  // 例:
  // switch (item.entityType) {
  //   case "activity":
  //     return activityRepository.sync(item);
  //   case "task":
  //     return taskRepository.sync(item);
  //   default:
  //     throw new Error(`Unknown entity type: ${item.entityType}`);
  // }

  // 現在はシミュレーションのため、少し待機するだけ
  await new Promise((resolve) => setTimeout(resolve, 10));
}