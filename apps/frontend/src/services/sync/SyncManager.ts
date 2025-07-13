import { apiClient } from "@frontend/utils/apiClient";

import { SyncQueue } from "./SyncQueue";

import type { SyncQueueItem } from "./SyncQueue";

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
};

export class SyncManager {
  private static instance: SyncManager | null = null;
  private syncQueue: SyncQueue;
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private lastSyncedAt: Date | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private userId?: string;

  private constructor(userId?: string) {
    this.userId = userId;
    this.syncQueue = new SyncQueue(userId);
    this.loadLastSyncedAt();
  }

  static getInstance(userId?: string): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(userId);
    }
    return SyncManager.instance;
  }

  // ユーザーIDが変わった場合に呼び出す
  updateUserId(userId?: string): void {
    if (this.userId !== userId) {
      this.userId = userId;
      // 新しいSyncQueueを作成
      this.syncQueue = new SyncQueue(userId);
    }
  }

  private loadLastSyncedAt(): void {
    const stored = localStorage.getItem("actiko-last-synced-at");
    if (stored) {
      this.lastSyncedAt = new Date(stored);
    }
  }

  private saveLastSyncedAt(): void {
    if (this.lastSyncedAt) {
      localStorage.setItem(
        "actiko-last-synced-at",
        this.lastSyncedAt.toISOString(),
      );
    }
  }

  async enqueue(
    entityType: SyncQueueItem["entityType"],
    entityId: string,
    operation: SyncQueueItem["operation"],
    payload: Record<string, unknown>,
  ): Promise<string> {
    return await this.syncQueue.enqueue(
      entityType,
      entityId,
      operation,
      payload,
    );
  }

  async syncBatch(batchSize = 10): Promise<SyncResult[]> {
    if (this.isSyncing) {
      return [];
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const items = await this.syncQueue.dequeue(batchSize);
      if (items.length === 0) {
        return [];
      }

      // 同期開始前にsyncPercentageを更新
      this.notifyListeners();

      const request: BatchSyncRequest = {
        items: items.map((item) => ({
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
        response = await apiClient.users.sync.batch.$post({
          json: request,
        });
      } catch (error) {
        // ネットワークエラーの場合、アイテムを失敗としてマーク（リトライ遅延付き）
        const errorMessage =
          error instanceof Error ? error.message : "Network error";
        for (const item of items) {
          await this.syncQueue.markAsFailed(item.id, errorMessage, true);
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
            await this.syncQueue.markAsFailed(item.id, errorMessage, true);
          } else {
            // 4xx エラーなどはリトライしない
            // リトライ回数を最大値に設定して削除する
            for (let i = 0; i < 3; i++) {
              await this.syncQueue.markAsFailed(item.id, errorMessage, false);
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
          await this.syncQueue.markAsSuccess(item.id);

          // 削除操作が成功した場合は、削除IDリストから削除するイベントを発火
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            window.dispatchEvent(
              new CustomEvent("sync-delete-success", {
                detail: { entityId: item.entityId },
              }),
            );
          }
        } else if (syncResult.status === "skipped") {
          // スキップされたアイテムも成功として扱い、キューから削除
          await this.syncQueue.markAsSuccess(item.id);

          // 削除操作がスキップされた場合も、削除IDリストから削除するイベントを発火
          if (
            item.operation === "delete" &&
            item.entityType === "activityLog"
          ) {
            window.dispatchEvent(
              new CustomEvent("sync-delete-success", {
                detail: { entityId: item.entityId },
              }),
            );
          }
        } else if (syncResult.status === "error") {
          await this.syncQueue.markAsFailed(
            item.id,
            syncResult.error || "Unknown error",
          );
        } else if (syncResult.status === "conflict") {
          await this.syncQueue.markAsFailed(item.id, "Conflict detected");
        }

        results.push(syncResult);
      }

      this.lastSyncedAt = new Date();
      this.saveLastSyncedAt();

      return results;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async syncAll(): Promise<void> {
    while (this.syncQueue.hasPendingItems()) {
      await this.syncBatch();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  startAutoSync(intervalMs = 30000): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    this.syncInterval = setInterval(async () => {
      if (!navigator.onLine) {
        return;
      }

      if (this.syncQueue.hasPendingItems()) {
        try {
          await this.syncBatch();
        } catch (error) {}
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  getSyncStatus(): SyncStatus {
    const pendingCount = this.syncQueue.getPendingCount();
    const syncingCount = this.syncQueue.getSyncingCount();
    const failedCount = this.syncQueue.getFailedCount();
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
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  subscribeToStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.getSyncStatus());

    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach((listener) => listener(status));
  }

  async clearQueue(): Promise<void> {
    await this.syncQueue.clear();
    this.notifyListeners();
  }

  async checkDuplicates(
    operations: Array<{
      entityType: SyncQueueItem["entityType"];
      entityId: string;
      operation: SyncQueueItem["operation"];
      timestamp: string;
    }>,
  ): Promise<
    Array<{ isDuplicate: boolean; conflictingOperationIds?: string[] }>
  > {
    const response = await apiClient.users.sync["check-duplicates"].$post({
      json: { operations },
    });

    if (!response.ok) {
      throw new Error("Duplicate check failed");
    }

    const result = await response.json();
    return result.results;
  }

  async pullSync(
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
  }> {
    const params = new URLSearchParams();
    if (lastSyncTimestamp) {
      params.append("lastSyncTimestamp", lastSyncTimestamp);
    }
    if (entityTypes && entityTypes.length > 0) {
      params.append("entityTypes", entityTypes.join(","));
    }
    params.append("limit", limit.toString());

    const response = await apiClient.users.sync.pull.$get({
      query: Object.fromEntries(params.entries()),
    });

    if (!response.ok) {
      throw new Error("Pull sync failed");
    }

    return await response.json();
  }
}
