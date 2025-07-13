import { v4 as uuidv4 } from "uuid";

import { syncCrypto } from "./crypto";

export type SyncOperation = "create" | "update" | "delete";
export type EntityType = "activity" | "activityLog" | "task" | "goal";

export type SyncItemStatus =
  | "pending"
  | "syncing"
  | "failed"
  | "failed_pending_retry";

export type SyncQueueItem = {
  id: string;
  clientId: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  timestamp: string;
  sequenceNumber: number;
  retryCount: number;
  status: SyncItemStatus;
  error?: string;
  lastRetryAt?: string;
  nextRetryAt?: string;
};

export class SyncQueue {
  private static readonly STORAGE_KEY = "actiko-sync-queue";
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1秒
  private static readonly MAX_RETRY_DELAY = 60000; // 60秒
  private queue: Record<string, SyncQueueItem>;
  private sequenceCounter: number;
  private storageEventHandler: ((event: StorageEvent) => void) | null = null;
  private userId?: string;
  private initializePromise: Promise<void> | null = null;

  constructor(userId?: string) {
    this.queue = {};
    this.sequenceCounter = 0;
    this.userId = userId;
    // 初期化を同期的に実行（ストレージからの読み込みは即座に完了）
    this.loadFromStorageSync();
    this.setupStorageListener();
  }

  private loadFromStorageSync(): void {
    try {
      const stored = localStorage.getItem(SyncQueue.STORAGE_KEY);
      if (stored) {
        // 暗号化されていない場合のみ同期的に処理
        if (!syncCrypto.isEncrypted(stored)) {
          const data = JSON.parse(stored);
          this.queue = data.queue || {};
          this.sequenceCounter = data.sequenceCounter || 0;

          // sequenceCounterが復元されない場合、既存アイテムの最大値から計算
          if (
            this.sequenceCounter === 0 &&
            Object.keys(this.queue).length > 0
          ) {
            const maxSequence = Math.max(
              ...Object.values(this.queue).map(
                (item) => item.sequenceNumber || 0,
              ),
            );
            this.sequenceCounter = maxSequence;
          }
        } else {
          // 暗号化されている場合は非同期で初期化
          this.initializePromise = this.loadFromStorage().catch(() => {
            // エラーが発生しても初期化を完了させる
            this.initializePromise = null;
          });
        }
      }
    } catch (error) {
      // エラーが発生した場合はストレージをクリアして初期化
      localStorage.removeItem(SyncQueue.STORAGE_KEY);
      this.queue = {};
      this.sequenceCounter = 0;
      this.initializePromise = null;
    }
  }

  private setupStorageListener(): void {
    // 他タブでの変更を検知
    this.storageEventHandler = (event: StorageEvent) => {
      if (event.key === SyncQueue.STORAGE_KEY && event.newValue !== null) {
        this.loadFromStorage();
      }
    };
    window.addEventListener("storage", this.storageEventHandler);
  }

  cleanup(): void {
    if (this.storageEventHandler) {
      window.removeEventListener("storage", this.storageEventHandler);
      this.storageEventHandler = null;
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(SyncQueue.STORAGE_KEY);
      if (stored) {
        // 暗号化されているかチェック
        const decrypted = syncCrypto.isEncrypted(stored)
          ? await syncCrypto.decrypt(stored, this.userId)
          : stored;

        const data = JSON.parse(decrypted);
        // 型安全性を確保するため、各アイテムを検証
        this.queue = data.queue || {};
        this.sequenceCounter = data.sequenceCounter || 0;

        // sequenceCounterが復元されない場合、既存アイテムの最大値から計算
        if (this.sequenceCounter === 0 && Object.keys(this.queue).length > 0) {
          const maxSequence = Math.max(
            ...Object.values(this.queue).map(
              (item) => item.sequenceNumber || 0,
            ),
          );
          this.sequenceCounter = maxSequence;
        }
      }
    } catch (error) {
      // エラーが発生した場合はストレージをクリアして初期化
      localStorage.removeItem(SyncQueue.STORAGE_KEY);
      this.queue = {};
      this.sequenceCounter = 0;
    } finally {
      // 必ず初期化完了を保証
      this.initializePromise = null;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        queue: this.queue,
        sequenceCounter: this.sequenceCounter,
      };
      const serialized = JSON.stringify(data);
      const encrypted = await syncCrypto.encrypt(serialized, this.userId);
      localStorage.setItem(SyncQueue.STORAGE_KEY, encrypted);
    } catch (error) {
      // ストレージの保存に失敗した場合は、エラーをスローして上位に伝播
      throw new Error(`Failed to save sync queue to storage: ${error}`);
    }
  }

  async enqueue(
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ): Promise<string> {
    // 初期化が完了していない場合は待機
    if (this.initializePromise) {
      try {
        await this.initializePromise;
      } catch {
      } finally {
        this.initializePromise = null;
      }
    }

    const id = uuidv4();
    const item: SyncQueueItem = {
      id,
      clientId: `client-${id}`,
      entityType,
      entityId,
      operation,
      payload,
      timestamp: new Date().toISOString(),
      sequenceNumber: ++this.sequenceCounter,
      retryCount: 0,
      status: "pending",
    };

    this.queue[id] = item;
    await this.saveToStorage();

    return id;
  }

  async dequeue(batchSize = 10): Promise<SyncQueueItem[]> {
    const now = new Date().toISOString();
    const pendingItems = Object.values(this.queue)
      .filter(
        (item) =>
          (item.status === "pending" ||
            item.status === "failed_pending_retry") &&
          (!item.nextRetryAt || item.nextRetryAt <= now),
      )
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .slice(0, batchSize);

    pendingItems.forEach((item) => {
      item.status = "syncing";
    });

    await this.saveToStorage();
    return pendingItems;
  }

  async markAsSuccess(id: string): Promise<void> {
    delete this.queue[id];
    await this.saveToStorage();
  }

  async markAsFailed(
    id: string,
    error: string,
    isNetworkError = false,
  ): Promise<void> {
    const item = this.queue[id];
    if (!item) return;

    item.status = "failed";
    item.error = error;
    item.retryCount++;
    item.lastRetryAt = new Date().toISOString();

    if (item.retryCount >= SyncQueue.MAX_RETRY_COUNT) {
      delete this.queue[id];
    } else {
      // エクスポネンシャルバックオフを適用
      const retryDelay = this.calculateRetryDelay(
        item.retryCount,
        isNetworkError,
      );
      item.nextRetryAt = new Date(Date.now() + retryDelay).toISOString();
      item.status = "failed_pending_retry";
    }

    await this.saveToStorage();
  }

  async markAsPending(id: string): Promise<void> {
    const item = this.queue[id];
    if (!item) return;

    item.status = "pending";
    await this.saveToStorage();
  }

  getPendingCount(): number {
    return Object.values(this.queue).filter(
      (item) =>
        item.status === "pending" || item.status === "failed_pending_retry",
    ).length;
  }

  getSyncingCount(): number {
    return Object.values(this.queue).filter((item) => item.status === "syncing")
      .length;
  }

  getFailedCount(): number {
    return Object.values(this.queue).filter(
      (item) =>
        item.status === "failed" || item.status === "failed_pending_retry",
    ).length;
  }

  getAllItems(): SyncQueueItem[] {
    return Object.values(this.queue);
  }

  async clear(): Promise<void> {
    this.queue = {};
    this.sequenceCounter = 0;
    await this.saveToStorage();
  }

  hasPendingItems(): boolean {
    return this.getPendingCount() > 0;
  }

  getDetailedStatus(): {
    pending: number;
    syncing: number;
    failed: number;
    failedPendingRetry: number;
  } {
    const items = Object.values(this.queue);
    return {
      pending: items.filter((item) => item.status === "pending").length,
      syncing: items.filter((item) => item.status === "syncing").length,
      failed: items.filter((item) => item.status === "failed").length,
      failedPendingRetry: items.filter(
        (item) => item.status === "failed_pending_retry",
      ).length,
    };
  }

  private calculateRetryDelay(
    retryCount: number,
    isNetworkError: boolean,
  ): number {
    // ネットワークエラーの場合はより長い遅延を使用
    const baseFactor = isNetworkError ? 2 : 1;
    const baseDelay = SyncQueue.BASE_RETRY_DELAY * baseFactor;

    // エクスポネンシャルバックオフ: 2^retryCount * baseDelay
    const delay = Math.min(
      baseDelay * 2 ** (retryCount - 1),
      SyncQueue.MAX_RETRY_DELAY,
    );

    // ジッターを追加（±20%）
    const jitter = delay * 0.2;
    return Math.floor(delay + (Math.random() - 0.5) * jitter);
  }

  getRetriableItems(): SyncQueueItem[] {
    const now = new Date().toISOString();
    return Object.values(this.queue).filter(
      (item) =>
        (item.status === "pending" || item.status === "failed_pending_retry") &&
        (!item.nextRetryAt || item.nextRetryAt <= now),
    );
  }
}
