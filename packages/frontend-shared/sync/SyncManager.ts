import { createSyncQueue } from "./SyncQueue";

import type {
  BatchSyncRequest,
  ISyncQueue,
  SyncApiClient,
  SyncManager,
  SyncQueueItem,
  SyncResult,
  SyncStatus,
  TimeProviderAdapter,
} from "./types";
import type { EventBusAdapter, NetworkAdapter } from "../adapters/types";

// App events constants
export const AppEvents = {
  SYNC_DELETE_SUCCESS: "sync-delete-success",
  SYNC_CREATE_SUCCESS: "sync-create-success",
  SYNC_UPDATE_SUCCESS: "sync-update-success",
} as const;

export type SyncManagerConfig = {
  userId?: string;
  autoSyncInterval?: number;
  dependencies?: {
    apiClient?: SyncApiClient;
    syncQueue?: ISyncQueue;
    storage?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
    };
    eventBus?: EventBusAdapter;
    timeProvider?: TimeProviderAdapter;
    networkStatusManager?: NetworkAdapter;
  };
};

// Singleton instance management
let syncManagerInstance: SyncManager | null = null;

/**
 * Create a sync manager factory function
 * Uses closure to manage state
 */
export function createSyncManager(config?: SyncManagerConfig): SyncManager {
  // Default dependencies
  const storage = config?.dependencies?.storage || {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  };

  const eventBus: EventBusAdapter = config?.dependencies?.eventBus || {
    emit: (event: string, data?: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
      }
    },
    on: (event: string, handler: (data?: unknown) => void) => {
      const listener = (e: Event) => {
        if (e instanceof CustomEvent) {
          handler(e.detail);
        }
      };
      if (typeof window !== "undefined") {
        window.addEventListener(event, listener);
        return () => window.removeEventListener(event, listener);
      }
      return () => {};
    },
    off: () => {},
  };

  const timeProvider: TimeProviderAdapter = config?.dependencies
    ?.timeProvider || {
    setInterval: (cb, ms) => window.setInterval(cb, ms) as unknown as number,
    clearInterval: (id) => window.clearInterval(id as unknown as number),
    now: () => Date.now(),
    getDate: () => new Date(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  const networkStatusManager: NetworkAdapter = config?.dependencies
    ?.networkStatusManager || {
    isOnline: () => navigator.onLine,
    addListener: (callback) => {
      const handleOnline = () => callback(true);
      const handleOffline = () => callback(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    },
  };

  // Private state
  let userId = config?.userId;
  let syncQueue =
    config?.dependencies?.syncQueue || createSyncQueue({ userId });
  let isSyncing = false;
  let syncListeners: Array<(status: SyncStatus) => void> = [];
  let lastSyncedAt: Date | null = null;
  let syncInterval: number | null = null;

  // Load last synced time
  const loadLastSyncedAt = (): void => {
    const stored = storage.getItem("actiko-last-synced-at");
    if (stored) {
      lastSyncedAt = new Date(stored);
    }
  };

  // Save last synced time
  const saveLastSyncedAt = (): void => {
    if (lastSyncedAt) {
      storage.setItem("actiko-last-synced-at", lastSyncedAt.toISOString());
    }
  };

  // Notify listeners
  const notifyListeners = (): void => {
    const status = getSyncStatus();
    syncListeners.forEach((listener) => listener(status));
  };

  // Initialize
  loadLastSyncedAt();

  // Public API
  const updateUserId = (newUserId?: string): void => {
    if (userId !== newUserId) {
      userId = newUserId;
      // Create new SyncQueue
      syncQueue = createSyncQueue({ userId: newUserId });
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
    if (!config?.dependencies?.apiClient) {
      throw new Error("API client is required for sync operations");
    }

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

      // Update syncPercentage before sync
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
        response = await config.dependencies.apiClient.users.sync.batch.$post({
          json: request,
        });
      } catch (error) {
        // Mark items as failed with retry delay for network errors
        const errorMessage =
          error instanceof Error ? error.message : "Network error";
        for (const item of items) {
          await syncQueue.markAsFailed(item.id, errorMessage, true);
        }
        throw error;
      }

      if (!response.ok) {
        // Handle API errors based on status code
        const isRetriable = response.status >= 500 || response.status === 429;
        const errorMessage = `API error: ${response.status}`;

        for (const item of items) {
          if (isRetriable) {
            // 5xx or 429 errors are retriable
            await syncQueue.markAsFailed(item.id, errorMessage, true);
          } else {
            // 4xx errors are not retriable
            // Set retry count to max to remove
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

          // Fire event for successful delete operation
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            eventBus.emit("sync-delete-success", {
              entityId: item.entityId,
            });
          }

          // Fire event for successful create operation
          if (item.operation === "create" && syncResult.payload) {
            eventBus.emit(AppEvents.SYNC_CREATE_SUCCESS, {
              entityType: item.entityType,
              entityId: item.entityId,
              serverId: syncResult.serverId,
              payload: syncResult.payload,
            });
          }

          // Fire event for successful update operation
          if (item.operation === "update" && syncResult.payload) {
            eventBus.emit(AppEvents.SYNC_UPDATE_SUCCESS, {
              entityType: item.entityType,
              entityId: item.entityId,
              payload: syncResult.payload,
            });
          }

          // Fire event for successful task delete
          if (item.operation === "delete" && item.entityType === "task") {
            eventBus.emit("sync-delete-success", {
              entityId: item.entityId,
              entityType: "task",
            });
          }
        } else if (syncResult.status === "skipped") {
          // Treat skipped items as success and remove from queue
          await syncQueue.markAsSuccess(item.id);

          // Fire event for skipped delete operation
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            eventBus.emit("sync-delete-success", {
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
      await timeProvider.sleep(1000);
    }
  };

  const startAutoSync = (intervalMs = 30000): void => {
    if (syncInterval) {
      stopAutoSync();
    }

    syncInterval = timeProvider.setInterval(async () => {
      if (!networkStatusManager.isOnline()) {
        return;
      }

      if (syncQueue.hasPendingItems()) {
        try {
          await syncBatch();
        } catch (error) {}
      }
    }, intervalMs) as number;
  };

  const stopAutoSync = (): void => {
    if (syncInterval) {
      timeProvider.clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  const getSyncStatus = (): SyncStatus => {
    const pendingCount = syncQueue.getPendingCount();
    const syncingCount = syncQueue.getSyncingCount();
    const failedCount = syncQueue.getFailedCount();
    const totalCount = pendingCount + syncingCount + failedCount;

    // Include syncing items in progress percentage
    const completedCount = 0; // Completed items are removed from queue
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
    if (!config?.dependencies?.apiClient) {
      throw new Error("API client is required for duplicate check");
    }

    const response = await config.dependencies.apiClient.users.sync[
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
    if (!config?.dependencies?.apiClient) {
      throw new Error("API client is required for pull sync");
    }

    const params = new URLSearchParams();
    if (lastSyncTimestamp) {
      params.append("lastSyncTimestamp", lastSyncTimestamp);
    }
    if (entityTypes && entityTypes.length > 0) {
      params.append("entityTypes", entityTypes.join(","));
    }
    params.append("limit", limit.toString());

    const response = await config.dependencies.apiClient.users.sync.pull.$get({
      query: Object.fromEntries(params.entries()),
    });

    if (!response.ok) {
      throw new Error("Pull sync failed");
    }

    return await response.json();
  };

  // Return public API
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
 * Get singleton instance
 */
export function getSyncManagerInstance(userId?: string): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = createSyncManager({ userId });
  }
  return syncManagerInstance;
}
