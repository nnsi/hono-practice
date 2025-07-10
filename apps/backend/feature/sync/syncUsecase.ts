import {
  canRetrySync,
  groupByEntityType,
  markAsFailed,
} from "@backend/domain/sync";
import { UnexpectedError } from "@backend/error";

import type { BatchSyncRequest, PullSyncRequest } from "@dtos/request";
import type { BatchSyncResponse, PullSyncResponse } from "@dtos/response";

import type { SyncRepository } from "./syncRepository";
import type { ConflictResolutionStrategy, SyncService } from "./syncService";
import type { ActivityRepository } from "../activity/activityRepository";
import type { ActivityGoalRepository } from "../activitygoal/activityGoalRepository";
import type { ActivityLogRepository } from "../activityLog/activityLogRepository";
import type { TaskRepository } from "../task/taskRepository";
import type { UserId } from "@backend/domain";
import type {
  DuplicateCheckResult,
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
    }>,
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
    },
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
    }>,
  ): Promise<SyncQueueEntity[]>;
  batchSync(
    userId: string,
    request: BatchSyncRequest,
    strategy?: ConflictResolutionStrategy,
  ): Promise<BatchSyncResponse>;
  getSyncQueueItems(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<{
    items: SyncQueueEntity[];
    total: number;
    hasMore: boolean;
  }>;
  deleteSyncQueueItem(userId: string, queueId: string): Promise<void>;
  pullSync(userId: string, request: PullSyncRequest): Promise<PullSyncResponse>;
};

export function newSyncUsecase(
  syncRepository: SyncRepository,
  syncService?: SyncService,
  repositories?: {
    activityRepository?: ActivityRepository;
    activityLogRepository?: ActivityLogRepository;
    taskRepository?: TaskRepository;
    goalRepository?: ActivityGoalRepository;
  },
): SyncUsecase {
  return {
    checkDuplicates: checkDuplicates(syncRepository),
    getSyncStatus: getSyncStatus(syncRepository),
    processSyncQueue: processSyncQueue(syncRepository, syncService),
    enqueueSyncOperations: enqueueSyncOperations(syncRepository),
    batchSync: batchSync(syncRepository, syncService),
    getSyncQueueItems: getSyncQueueItems(syncRepository),
    deleteSyncQueueItem: deleteSyncQueueItem(syncRepository),
    pullSync: pullSync(syncRepository, repositories),
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
    }>,
  ): Promise<DuplicateCheckResult[]> => {
    try {
      return await syncRepository.findDuplicatesByTimestamps(
        userId,
        operations,
      );
    } catch (error) {
      throw new UnexpectedError("重複チェックに失敗しました", error as Error);
    }
  };
}

function getSyncStatus(syncRepository: SyncRepository) {
  return async (
    userId: string,
  ): Promise<{
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
        totalCount === 0
          ? 100
          : Math.round((status.syncedCount / totalCount) * 100);

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

function processSyncQueue(
  syncRepository: SyncRepository,
  syncService?: SyncService,
) {
  return async (
    userId: string,
    options?: {
      batchSize?: number;
      maxRetries?: number;
    },
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
      for (const [, items] of Object.entries(groupedItems)) {
        for (const item of items) {
          try {
            // メタデータの状態を「同期中」に更新
            const metadata = await syncRepository.getMetadataByEntity(
              userId,
              item.entityType,
              item.entityId,
            );

            if (metadata) {
              await syncRepository.updateSyncMetadata(metadata.id, {
                status: "syncing",
              });
            }

            // エンティティ固有の同期処理を実行
            if (syncService) {
              await syncService.syncEntity(item);
            } else {
              // syncServiceが提供されていない場合は警告
              console.warn(
                "SyncService not provided, skipping actual sync operation",
              );
            }

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
              item.entityId,
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
      throw new UnexpectedError(
        "同期キューの処理に失敗しました",
        error as Error,
      );
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
    }>,
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
        })),
      );

      // 重複していない操作のみエンキュー
      const nonDuplicateOps = operations.filter(
        (_, index) => !duplicateChecks[index].isDuplicate,
      );

      if (nonDuplicateOps.length === 0) {
        return [];
      }

      return await syncRepository.enqueueSync(nonDuplicateOps);
    } catch (error) {
      throw new UnexpectedError(
        "同期操作のエンキューに失敗しました",
        error as Error,
      );
    }
  };
}

function batchSync(syncRepository: SyncRepository, syncService?: SyncService) {
  return async (
    userId: string,
    request: BatchSyncRequest,
    strategy: ConflictResolutionStrategy = "timestamp",
  ): Promise<BatchSyncResponse> => {
    if (!syncService) {
      throw new UnexpectedError("SyncServiceが提供されていません");
    }

    try {
      // 同期結果を取得
      const results = await syncService.syncBatchItems(request.items, strategy);

      // サーバー側の変更を取得（最後の同期以降の変更）
      const serverChanges = request.lastSyncTimestamp
        ? await syncRepository.getChangesAfter(
            userId,
            new Date(request.lastSyncTimestamp),
          )
        : [];

      // レスポンスを構築
      const response: BatchSyncResponse = {
        results,
        serverChanges: serverChanges.map((change) => ({
          entityType: change.entityType,
          entityId: change.entityId,
          operation: change.operation as "create" | "update" | "delete",
          payload: change.payload,
          timestamp: change.timestamp.toISOString(),
        })),
        syncTimestamp: new Date().toISOString(),
        hasMore: serverChanges.length >= 100, // 100件以上ある場合は追加の同期が必要
      };

      return response;
    } catch (error) {
      throw new UnexpectedError("バッチ同期に失敗しました", error as Error);
    }
  };
}

function getSyncQueueItems(syncRepository: SyncRepository) {
  return async (
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    items: SyncQueueEntity[];
    total: number;
    hasMore: boolean;
  }> => {
    try {
      const items = await syncRepository.getSyncQueueByUser(
        userId,
        limit,
        offset,
      );
      const total = await syncRepository.getSyncQueueCount(userId);
      const hasMore = offset + items.length < total;

      return {
        items,
        total,
        hasMore,
      };
    } catch (error) {
      throw new UnexpectedError(
        "同期キューの取得に失敗しました",
        error as Error,
      );
    }
  };
}

function deleteSyncQueueItem(syncRepository: SyncRepository) {
  return async (userId: string, queueId: string): Promise<void> => {
    try {
      // キューアイテムがユーザーのものか確認
      const queueItem = await syncRepository.getSyncQueueById(queueId);
      if (!queueItem || queueItem.userId !== userId) {
        throw new UnexpectedError("同期キューアイテムが見つかりません");
      }

      // キューアイテムを削除
      await syncRepository.deleteQueueItems([queueItem.id]);
    } catch (error) {
      if (error instanceof UnexpectedError) {
        throw error;
      }
      throw new UnexpectedError(
        "同期キューアイテムの削除に失敗しました",
        error as Error,
      );
    }
  };
}

function pullSync(
  _syncRepository: SyncRepository,
  repositories?: {
    activityRepository?: ActivityRepository;
    activityLogRepository?: ActivityLogRepository;
    taskRepository?: TaskRepository;
    goalRepository?: ActivityGoalRepository;
  },
) {
  return async (
    userId: string,
    request: PullSyncRequest,
  ): Promise<PullSyncResponse> => {
    try {
      if (!repositories) {
        throw new UnexpectedError("リポジトリが提供されていません");
      }

      const {
        activityRepository,
        activityLogRepository,
        taskRepository,
        goalRepository,
      } = repositories;

      const lastSyncTimestamp = request.lastSyncTimestamp
        ? new Date(request.lastSyncTimestamp)
        : new Date(0); // 初回同期の場合は1970年から

      const entityTypes = request.entityTypes || [
        "activity",
        "activityLog",
        "task",
        "goal",
      ];
      const limit = request.limit || 100;

      const changes: Array<{
        entityType: "activity" | "activityLog" | "task" | "goal";
        entityId: string;
        operation: "create" | "update" | "delete";
        data?: Record<string, any>;
        updatedAt: string;
      }> = [];

      let hasMore = false;

      // 各エンティティタイプの変更を取得
      if (entityTypes.includes("activity") && activityRepository) {
        const { activities, hasMore: activityHasMore } =
          await activityRepository.getActivityChangesAfter(
            userId as UserId,
            lastSyncTimestamp,
            limit,
          );

        for (const activity of activities) {
          changes.push({
            entityType: "activity",
            entityId: activity.id,
            operation: activity.type === "new" ? "create" : "update",
            data: activity,
            updatedAt:
              activity.type === "persisted"
                ? activity.updatedAt.toISOString()
                : new Date().toISOString(),
          });
        }

        hasMore = hasMore || activityHasMore;
      }

      if (entityTypes.includes("activityLog") && activityLogRepository) {
        const { activityLogs, hasMore: activityLogHasMore } =
          await activityLogRepository.getActivityLogChangesAfter(
            userId as UserId,
            lastSyncTimestamp,
            limit,
          );

        for (const log of activityLogs) {
          changes.push({
            entityType: "activityLog",
            entityId: log.id,
            operation: log.type === "new" ? "create" : "update",
            data: log,
            updatedAt:
              log.type === "persisted"
                ? log.updatedAt.toISOString()
                : new Date().toISOString(),
          });
        }

        hasMore = hasMore || activityLogHasMore;
      }

      if (entityTypes.includes("task") && taskRepository) {
        const { tasks, hasMore: taskHasMore } =
          await taskRepository.getTaskChangesAfter(
            userId as UserId,
            lastSyncTimestamp,
            limit,
          );

        for (const task of tasks) {
          changes.push({
            entityType: "task",
            entityId: task.id,
            operation: task.type === "new" ? "create" : "update",
            data: task,
            updatedAt:
              task.type === "persisted"
                ? task.updatedAt.toISOString()
                : new Date().toISOString(),
          });
        }

        hasMore = hasMore || taskHasMore;
      }

      if (entityTypes.includes("goal") && goalRepository) {
        const { goals, hasMore: goalHasMore } =
          await goalRepository.getActivityGoalChangesAfter(
            userId as UserId,
            lastSyncTimestamp,
            limit,
          );

        for (const goal of goals) {
          changes.push({
            entityType: "goal",
            entityId: goal.id,
            operation: goal.type === "new" ? "create" : "update",
            data: goal,
            updatedAt:
              goal.type === "persisted"
                ? goal.updatedAt.toISOString()
                : new Date().toISOString(),
          });
        }

        hasMore = hasMore || goalHasMore;
      }

      // updatedAtでソート
      changes.sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      );

      // 制限を超える場合は切り詰める
      const limitedChanges = changes.slice(0, limit);
      hasMore = hasMore || changes.length > limit;

      return {
        changes: limitedChanges,
        syncTimestamp: new Date().toISOString(),
        hasMore,
        nextCursor: hasMore
          ? limitedChanges[limitedChanges.length - 1]?.updatedAt
          : undefined,
      };
    } catch (error) {
      throw new UnexpectedError("Pull同期に失敗しました", error as Error);
    }
  };
}
