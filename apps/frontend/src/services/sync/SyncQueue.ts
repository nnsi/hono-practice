import {
  createBrowserTimeProvider,
  createLocalStorageProvider,
} from "@frontend/services/abstractions";
import { v4 as uuidv4 } from "uuid";

import { syncCrypto as defaultSyncCrypto } from "./crypto";

import type { ISyncQueue, SyncQueueDependencies } from "./types";

export type SyncOperation = "create" | "update" | "delete";
export type EntityType = "activity" | "activityLog" | "task" | "goal";
export type { ISyncQueue } from "./types";

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

/**
 * SyncQueueの設定
 */
export type SyncQueueConfig = {
  userId?: string;
  storageKey?: string;
  dependencies?: Partial<SyncQueueDependencies>;
};

const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY = 1000; // 1秒
const MAX_RETRY_DELAY = 60000; // 60秒

/**
 * SyncQueueを作成するファクトリー関数
 * クロージャを使用して状態を管理
 */
export function createSyncQueue(config?: SyncQueueConfig): ISyncQueue {
  const dependencies: SyncQueueDependencies = {
    storage: config?.dependencies?.storage || createLocalStorageProvider(),
    cryptoProvider: config?.dependencies?.cryptoProvider || defaultSyncCrypto,
    timeProvider:
      config?.dependencies?.timeProvider || createBrowserTimeProvider(),
  };

  const STORAGE_KEY = config?.storageKey || "actiko-sync-queue";
  const userId = config?.userId;

  // プライベート状態
  let queue: Record<string, SyncQueueItem> = {};
  let sequenceCounter = 0;
  let storageEventHandler: (() => void) | null = null;
  let initializePromise: Promise<void> | null = null;

  // リトライ遅延を計算
  const calculateRetryDelay = (
    retryCount: number,
    isNetworkError: boolean,
  ): number => {
    // ネットワークエラーの場合はより長い遅延を使用
    const baseFactor = isNetworkError ? 2 : 1;
    const baseDelay = BASE_RETRY_DELAY * baseFactor;

    // エクスポネンシャルバックオフ: 2^retryCount * baseDelay
    const delay = Math.min(baseDelay * 2 ** (retryCount - 1), MAX_RETRY_DELAY);

    // ジッターを追加（±20%）
    const jitter = delay * 0.2;
    return Math.floor(delay + (Math.random() - 0.5) * jitter);
  };

  // ストレージに保存
  const saveToStorage = async (): Promise<void> => {
    try {
      const data = {
        queue,
        sequenceCounter,
      };
      const serialized = JSON.stringify(data);
      const encrypted = await dependencies.cryptoProvider.encrypt(
        serialized,
        userId,
      );
      dependencies.storage.setItem(STORAGE_KEY, encrypted);
    } catch (error) {
      throw new Error(`Failed to save sync queue to storage: ${error}`);
    }
  };

  // ストレージから読み込み（非同期）
  const loadFromStorage = async (): Promise<void> => {
    try {
      const stored = dependencies.storage.getItem(STORAGE_KEY);
      if (stored) {
        // 暗号化されているかチェック
        const decrypted = dependencies.cryptoProvider.isEncrypted(stored)
          ? await dependencies.cryptoProvider.decrypt(stored, userId)
          : stored;

        const data = JSON.parse(decrypted);
        queue = data.queue || {};
        sequenceCounter = data.sequenceCounter || 0;

        // sequenceCounterが復元されない場合、既存アイテムの最大値から計算
        if (sequenceCounter === 0 && Object.keys(queue).length > 0) {
          const maxSequence = Math.max(
            ...Object.values(queue).map((item) => item.sequenceNumber || 0),
          );
          sequenceCounter = maxSequence;
        }
      }
    } catch (error) {
      // エラーが発生した場合はストレージをクリアして初期化
      dependencies.storage.removeItem(STORAGE_KEY);
      queue = {};
      sequenceCounter = 0;
    } finally {
      // 必ず初期化完了を保証
      initializePromise = null;
    }
  };

  // ストレージから読み込み（同期）
  const loadFromStorageSync = (): void => {
    try {
      const stored = dependencies.storage.getItem(STORAGE_KEY);
      if (stored) {
        // 暗号化されていない場合のみ同期的に処理
        if (!dependencies.cryptoProvider.isEncrypted(stored)) {
          const data = JSON.parse(stored);
          queue = data.queue || {};
          sequenceCounter = data.sequenceCounter || 0;

          // sequenceCounterが復元されない場合、既存アイテムの最大値から計算
          if (sequenceCounter === 0 && Object.keys(queue).length > 0) {
            const maxSequence = Math.max(
              ...Object.values(queue).map((item) => item.sequenceNumber || 0),
            );
            sequenceCounter = maxSequence;
          }
        } else {
          // 暗号化されている場合は非同期で初期化
          initializePromise = loadFromStorage().catch(() => {
            // エラーが発生しても初期化を完了させる
            initializePromise = null;
          });
        }
      }
    } catch (error) {
      // エラーが発生した場合はストレージをクリアして初期化
      dependencies.storage.removeItem(STORAGE_KEY);
      queue = {};
      sequenceCounter = 0;
      initializePromise = null;
    }
  };

  // ストレージリスナーのセットアップ
  const setupStorageListener = (): void => {
    // 他タブでの変更を検知
    storageEventHandler = dependencies.storage.addEventListener((event) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        loadFromStorage();
      }
    });
  };

  // 初期化
  loadFromStorageSync();
  setupStorageListener();

  // パブリックAPI
  const enqueue = async (
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ): Promise<string> => {
    // 初期化が完了していない場合は待機
    if (initializePromise) {
      try {
        await initializePromise;
      } catch {
      } finally {
        initializePromise = null;
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
      timestamp: dependencies.timeProvider.getDate().toISOString(),
      sequenceNumber: ++sequenceCounter,
      retryCount: 0,
      status: "pending",
    };

    queue[id] = item;
    await saveToStorage();

    return id;
  };

  const dequeue = async (batchSize = 10): Promise<SyncQueueItem[]> => {
    const now = dependencies.timeProvider.getDate().toISOString();
    const pendingItems = Object.values(queue)
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

    await saveToStorage();
    return pendingItems;
  };

  const markAsSuccess = async (id: string): Promise<void> => {
    delete queue[id];
    await saveToStorage();
  };

  const markAsFailed = async (
    id: string,
    error: string,
    isNetworkError = false,
  ): Promise<void> => {
    const item = queue[id];
    if (!item) return;

    item.status = "failed";
    item.error = error;
    item.retryCount++;
    item.lastRetryAt = dependencies.timeProvider.getDate().toISOString();

    if (item.retryCount >= MAX_RETRY_COUNT) {
      delete queue[id];
    } else {
      // エクスポネンシャルバックオフを適用
      const retryDelay = calculateRetryDelay(item.retryCount, isNetworkError);
      item.nextRetryAt = new Date(
        dependencies.timeProvider.now() + retryDelay,
      ).toISOString();
      item.status = "failed_pending_retry";
    }

    await saveToStorage();
  };

  const markAsPending = async (id: string): Promise<void> => {
    const item = queue[id];
    if (!item) return;

    item.status = "pending";
    await saveToStorage();
  };

  const getPendingCount = (): number => {
    return Object.values(queue).filter(
      (item) =>
        item.status === "pending" || item.status === "failed_pending_retry",
    ).length;
  };

  const getSyncingCount = (): number => {
    return Object.values(queue).filter((item) => item.status === "syncing")
      .length;
  };

  const getFailedCount = (): number => {
    return Object.values(queue).filter(
      (item) =>
        item.status === "failed" || item.status === "failed_pending_retry",
    ).length;
  };

  const getAllItems = (): SyncQueueItem[] => {
    return Object.values(queue);
  };

  const clear = async (): Promise<void> => {
    queue = {};
    sequenceCounter = 0;
    await saveToStorage();
  };

  const hasPendingItems = (): boolean => {
    return getPendingCount() > 0;
  };

  const getDetailedStatus = (): {
    pending: number;
    syncing: number;
    failed: number;
    failedPendingRetry: number;
  } => {
    const items = Object.values(queue);
    return {
      pending: items.filter((item) => item.status === "pending").length,
      syncing: items.filter((item) => item.status === "syncing").length,
      failed: items.filter((item) => item.status === "failed").length,
      failedPendingRetry: items.filter(
        (item) => item.status === "failed_pending_retry",
      ).length,
    };
  };

  const getRetriableItems = (): SyncQueueItem[] => {
    const now = dependencies.timeProvider.getDate().toISOString();
    return Object.values(queue).filter(
      (item) =>
        (item.status === "pending" || item.status === "failed_pending_retry") &&
        (!item.nextRetryAt || item.nextRetryAt <= now),
    );
  };

  const cleanup = (): void => {
    if (storageEventHandler) {
      storageEventHandler();
      storageEventHandler = null;
    }
  };

  // パブリックAPIを返す
  return {
    enqueue,
    dequeue,
    markAsSuccess,
    markAsFailed,
    markAsPending,
    getPendingCount,
    getSyncingCount,
    getFailedCount,
    getAllItems,
    clear,
    hasPendingItems,
    getDetailedStatus,
    getRetriableItems,
    cleanup,
  };
}
