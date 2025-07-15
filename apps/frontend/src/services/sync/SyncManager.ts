import {
  AppEvents,
  createBrowserNetworkStatusManager,
  createBrowserTimeProvider,
  createLocalStorageProvider,
  createWindowEventBus,
} from "@frontend/services/abstractions";
import { apiClient as defaultApiClient } from "@frontend/utils/apiClient";

import { createSyncQueue } from "./SyncQueue";

import type { SyncQueueItem } from "./SyncQueue";
import type { SyncManagerDependencies } from "./types";

// TODO: Move to DTOs when available
export type BatchSyncRequest = {
  items: Array<{
    clientId: string;
    entityType: "activity" | "activityLog" | "task" | "goal";
    entityId: string;
    operation: "create" | "update" | "delete";
    payload: Record<string, unknown>;
    timestamp: string;
    sequenceNumber: number;
    version?: number;
  }>;
  lastSyncTimestamp?: string;
  clientVersion?: string;
};

export type SyncStatus = {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  totalCount: number;
  syncPercentage: number;
  lastSyncedAt: Date | null;
};

export type SyncResult = {
  clientId: string;
  status: "success" | "conflict" | "error" | "skipped";
  serverId?: string;
  conflictData?: Record<string, unknown>;
  error?: string;
  message?: string;
  payload?: Record<string, unknown>;
};

/**
 * SyncManagerの設定
 */
export type SyncManagerConfig = {
  userId?: string;
  autoSyncInterval?: number;
  dependencies?: Partial<SyncManagerDependencies>;
};

export type SyncManager = {
  updateUserId: (userId?: string) => void;
  enqueue: (
    entityType: SyncQueueItem["entityType"],
    entityId: string,
    operation: SyncQueueItem["operation"],
    payload: Record<string, unknown>,
  ) => Promise<string>;
  syncBatch: (batchSize?: number) => Promise<SyncResult[]>;
  syncAll: () => Promise<void>;
  startAutoSync: (intervalMs?: number) => void;
  stopAutoSync: () => void;
  getSyncStatus: () => SyncStatus;
  subscribeToStatus: (listener: (status: SyncStatus) => void) => () => void;
  clearQueue: () => Promise<void>;
  checkDuplicates: (
    operations: Array<{
      entityType: SyncQueueItem["entityType"];
      entityId: string;
      operation: SyncQueueItem["operation"];
      timestamp: string;
    }>,
  ) => Promise<
    Array<{ isDuplicate: boolean; conflictingOperationIds?: string[] }>
  >;
  pullSync: (
    lastSyncTimestamp?: string,
    entityTypes?: SyncQueueItem["entityType"][],
    limit?: number,
  ) => Promise<{
    changes: Array<{
      entityType: string;
      entityId: string;
      operation: string;
      payload: Record<string, unknown>;
      timestamp: string;
      version: number;
    }>;
    hasMore: boolean;
    nextTimestamp?: string;
  }>;
};

// シングルトンインスタンスの管理
let syncManagerInstance: SyncManager | null = null;

/**
 * SyncManagerを作成するファクトリー関数
 * クロージャを使用して状態を管理
 */
export function createSyncManager(config?: SyncManagerConfig): SyncManager {
  const dependencies: SyncManagerDependencies = {
    apiClient: config?.dependencies?.apiClient || defaultApiClient,
    syncQueue:
      config?.dependencies?.syncQueue ||
      createSyncQueue({ userId: config?.userId }),
    storage: config?.dependencies?.storage || createLocalStorageProvider(),
    eventBus: config?.dependencies?.eventBus || createWindowEventBus(),
    timeProvider:
      config?.dependencies?.timeProvider || createBrowserTimeProvider(),
    networkStatusManager:
      config?.dependencies?.networkStatusManager ||
      createBrowserNetworkStatusManager(),
  };

  // プライベート状態
  let userId = config?.userId;
  let syncQueue = dependencies.syncQueue;
  let isSyncing = false;
  let syncListeners: Array<(status: SyncStatus) => void> = [];
  let lastSyncedAt: Date | null = null;
  let syncInterval: number | null = null;

  // 最後の同期時刻を読み込み
  const loadLastSyncedAt = (): void => {
    const stored = dependencies.storage.getItem("actiko-last-synced-at");
    if (stored) {
      lastSyncedAt = new Date(stored);
    }
  };

  // 最後の同期時刻を保存
  const saveLastSyncedAt = (): void => {
    if (lastSyncedAt) {
      dependencies.storage.setItem(
        "actiko-last-synced-at",
        lastSyncedAt.toISOString(),
      );
    }
  };

  // リスナーに通知
  const notifyListeners = (): void => {
    const status = getSyncStatus();
    syncListeners.forEach((listener) => listener(status));
  };

  // 初期化
  loadLastSyncedAt();

  // パブリックAPI
  const updateUserId = (newUserId?: string): void => {
    if (userId !== newUserId) {
      userId = newUserId;
      // 新しいSyncQueueを作成
      syncQueue = createSyncQueue({ userId: newUserId });
      dependencies.syncQueue = syncQueue;
    }
  };

  const enqueue = async (
    entityType: SyncQueueItem["entityType"],
    entityId: string,
    operation: SyncQueueItem["operation"],
    payload: Record<string, unknown>,
  ): Promise<string> => {
    return await syncQueue.enqueue(entityType, entityId, operation, payload);
  };

  const syncBatch = async (batchSize = 10): Promise<SyncResult[]> => {
    if (isSyncing) {
      return [];
    }

    isSyncing = true;
    notifyListeners();

    try {
      const items = await syncQueue.dequeue(batchSize);
      if (items.length === 0) {
        return [];
      }

      // 同期開始前にsyncPercentageを更新
      notifyListeners();

      const request: BatchSyncRequest = {
        items: items.map((item: SyncQueueItem) => ({
          clientId: item.clientId,
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          payload: item.payload,
          timestamp: item.timestamp,
          sequenceNumber: item.sequenceNumber,
        })),
      };

      let response: Response;
      try {
        response = await dependencies.apiClient.users.sync.batch.$post({
          json: request,
        });
      } catch (error) {
        // ネットワークエラーの場合、アイテムを失敗としてマーク（リトライ遅延付き）
        const errorMessage =
          error instanceof Error ? error.message : "Network error";
        for (const item of items) {
          await syncQueue.markAsFailed(item.id, errorMessage, true);
        }
        throw error;
      }

      if (!response.ok) {
        // APIエラーの場合、ステータスコードに応じて処理
        const isRetriable = response.status >= 500 || response.status === 429;
        const errorMessage = `API error: ${response.status}`;

        for (const item of items) {
          if (isRetriable) {
            // 5xx または 429 エラーはリトライ対象
            await syncQueue.markAsFailed(item.id, errorMessage, true);
          } else {
            // 4xx エラーなどはリトライしない
            // リトライ回数を最大値に設定して削除する
            for (let i = 0; i < 3; i++) {
              await syncQueue.markAsFailed(item.id, errorMessage, false);
            }
          }
        }
        throw new Error(`Batch sync failed with status: ${response.status}`);
      }

      const result = await response.json();
      const results: SyncResult[] = [];

      for (let index = 0; index < result.results.length; index++) {
        const syncResult = result.results[index] as SyncResult;
        const item = items[index];
        if (!item) continue;

        if (syncResult.status === "success") {
          await syncQueue.markAsSuccess(item.id);

          // 削除操作が成功した場合は、削除IDリストから削除するイベントを発火
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            dependencies.eventBus.emit("sync-delete-success", {
              entityId: item.entityId,
            });
          }

          // 作成操作が成功した場合は、作成されたエンティティのデータを含むイベントを発火
          if (item.operation === "create" && syncResult.payload) {
            dependencies.eventBus.emit(AppEvents.SYNC_CREATE_SUCCESS, {
              entityType: item.entityType,
              entityId: item.entityId,
              serverId: syncResult.serverId,
              payload: syncResult.payload,
            });
          }

          // 更新操作が成功した場合も、更新されたエンティティのデータを含むイベントを発火
          if (item.operation === "update" && syncResult.payload) {
            dependencies.eventBus.emit(AppEvents.SYNC_UPDATE_SUCCESS, {
              entityType: item.entityType,
              entityId: item.entityId,
              payload: syncResult.payload,
            });
          }

          // タスクの削除操作が成功した場合
          if (item.operation === "delete" && item.entityType === "task") {
            dependencies.eventBus.emit("sync-delete-success", {
              entityId: item.entityId,
              entityType: "task",
            });
          }
        } else if (syncResult.status === "skipped") {
          // スキップされたアイテムも成功として扱い、キューから削除
          await syncQueue.markAsSuccess(item.id);

          // 削除操作がスキップされた場合も、削除IDリストから削除するイベントを発火
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            dependencies.eventBus.emit("sync-delete-success", {
              entityId: item.entityId,
            });
          }
        } else if (syncResult.status === "error") {
          await syncQueue.markAsFailed(
            item.id,
            syncResult.error || "Unknown error",
          );
        } else if (syncResult.status === "conflict") {
          await syncQueue.markAsFailed(item.id, "Conflict detected");
        }

        results.push(syncResult);
      }

      lastSyncedAt = new Date();
      saveLastSyncedAt();

      return results;
    } finally {
      isSyncing = false;
      notifyListeners();
    }
  };

  const syncAll = async (): Promise<void> => {
    while (syncQueue.hasPendingItems()) {
      await syncBatch();
      await dependencies.timeProvider.sleep(1000);
    }
  };

  const startAutoSync = (intervalMs = 30000): void => {
    if (syncInterval) {
      stopAutoSync();
    }

    syncInterval = dependencies.timeProvider.setInterval(async () => {
      if (!dependencies.networkStatusManager.isOnline()) {
        return;
      }

      if (syncQueue.hasPendingItems()) {
        try {
          await syncBatch();
        } catch (error) {}
      }
    }, intervalMs);
  };

  const stopAutoSync = (): void => {
    if (syncInterval) {
      dependencies.timeProvider.clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  const getSyncStatus = (): SyncStatus => {
    const pendingCount = syncQueue.getPendingCount();
    const syncingCount = syncQueue.getSyncingCount();
    const failedCount = syncQueue.getFailedCount();
    const totalCount = pendingCount + syncingCount + failedCount;

    // 同期中のアイテムも進捗率に含める
    const completedCount = 0; // 完了済みはキューから削除されるため0
    const inProgressCount = syncingCount;
    const syncPercentage =
      totalCount === 0
        ? 100
        : ((completedCount + inProgressCount * 0.5) / totalCount) * 100;

    return {
      pendingCount,
      syncingCount,
      failedCount,
      totalCount,
      syncPercentage: Math.round(syncPercentage),
      lastSyncedAt,
    };
  };

  const subscribeToStatus = (
    listener: (status: SyncStatus) => void,
  ): (() => void) => {
    syncListeners.push(listener);
    listener(getSyncStatus());

    return () => {
      syncListeners = syncListeners.filter((l) => l !== listener);
    };
  };

  const clearQueue = async (): Promise<void> => {
    await syncQueue.clear();
    notifyListeners();
  };

  const checkDuplicates = async (
    operations: Array<{
      entityType: SyncQueueItem["entityType"];
      entityId: string;
      operation: SyncQueueItem["operation"];
      timestamp: string;
    }>,
  ): Promise<
    Array<{ isDuplicate: boolean; conflictingOperationIds?: string[] }>
  > => {
    const response = await dependencies.apiClient.users.sync[
      "check-duplicates"
    ].$post({
      json: { operations },
    });

    if (!response.ok) {
      throw new Error("Duplicate check failed");
    }

    const result = await response.json();
    return result.results;
  };

  const pullSync = async (
    lastSyncTimestamp?: string,
    entityTypes?: SyncQueueItem["entityType"][],
    limit = 100,
  ): Promise<{
    changes: Array<{
      entityType: string;
      entityId: string;
      operation: string;
      payload: Record<string, unknown>;
      timestamp: string;
      version: number;
    }>;
    hasMore: boolean;
    nextTimestamp?: string;
  }> => {
    const params = new URLSearchParams();
    if (lastSyncTimestamp) {
      params.append("lastSyncTimestamp", lastSyncTimestamp);
    }
    if (entityTypes && entityTypes.length > 0) {
      params.append("entityTypes", entityTypes.join(","));
    }
    params.append("limit", limit.toString());

    const response = await dependencies.apiClient.users.sync.pull.$get({
      query: Object.fromEntries(params.entries()),
    });

    if (!response.ok) {
      throw new Error("Pull sync failed");
    }

    return await response.json();
  };

  // パブリックAPIを返す
  return {
    updateUserId,
    enqueue,
    syncBatch,
    syncAll,
    startAutoSync,
    stopAutoSync,
    getSyncStatus,
    subscribeToStatus,
    clearQueue,
    checkDuplicates,
    pullSync,
  };
}

/**
 * シングルトンインスタンスを取得
 */
export function getSyncManagerInstance(userId?: string): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = createSyncManager({ userId });
  }
  return syncManagerInstance;
}

