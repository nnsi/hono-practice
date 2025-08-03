import { v4 as uuidv4 } from "uuid";

import { createCryptoProvider } from "./crypto";

import type {
  CryptoProvider,
  EntityType,
  ISyncQueue,
  SyncOperation,
  SyncQueueItem,
  TimeProviderAdapter,
} from "./types";

export type SyncQueueConfig = {
  userId?: string;
  storageKey?: string;
  dependencies?: {
    storage?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
      addEventListener: (listener: (event: StorageEvent) => void) => () => void;
    };
    cryptoProvider?: CryptoProvider;
    timeProvider?: TimeProviderAdapter;
  };
};

const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 60 seconds

/**
 * Create a sync queue for managing offline operations
 */
export function createSyncQueue(config?: SyncQueueConfig): ISyncQueue {
  const STORAGE_KEY = config?.storageKey || "actiko-sync-queue";
  const userId = config?.userId;

  // Dependencies
  const storage = config?.dependencies?.storage || {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
    addEventListener: (listener: (event: StorageEvent) => void) => {
      const handler = (e: StorageEvent) => listener(e);
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };

  const cryptoProvider =
    config?.dependencies?.cryptoProvider || createCryptoProvider({ storage });
  const timeProvider: TimeProviderAdapter = config?.dependencies
    ?.timeProvider || {
    setInterval: (cb, ms) => window.setInterval(cb, ms) as unknown as number,
    clearInterval: (id) => window.clearInterval(id as unknown as number),
    now: () => Date.now(),
    getDate: () => new Date(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  // Private state
  let queue: Record<string, SyncQueueItem> = {};
  let sequenceCounter = 0;
  let storageEventHandler: (() => void) | null = null;
  let initializePromise: Promise<void> | null = null;

  // Calculate retry delay
  const calculateRetryDelay = (
    retryCount: number,
    isNetworkError: boolean,
  ): number => {
    // Use longer delay for network errors
    const baseFactor = isNetworkError ? 2 : 1;
    const baseDelay = BASE_RETRY_DELAY * baseFactor;

    // Exponential backoff: 2^retryCount * baseDelay
    const delay = Math.min(baseDelay * 2 ** (retryCount - 1), MAX_RETRY_DELAY);

    // Add jitter (±20%)
    const jitter = delay * 0.2;
    return Math.floor(delay + (Math.random() - 0.5) * jitter);
  };

  // Save to storage
  const saveToStorage = async (): Promise<void> => {
    try {
      const data = {
        queue,
        sequenceCounter,
      };
      const serialized = JSON.stringify(data);
      const encrypted = await cryptoProvider.encrypt(serialized, userId);
      storage.setItem(STORAGE_KEY, encrypted);
    } catch (error) {
      throw new Error(`Failed to save sync queue to storage: ${error}`);
    }
  };

  // Load from storage (async)
  const loadFromStorage = async (): Promise<void> => {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored) {
        // Check if encrypted
        const decrypted = cryptoProvider.isEncrypted(stored)
          ? await cryptoProvider.decrypt(stored, userId)
          : stored;

        const data = JSON.parse(decrypted);
        queue = data.queue || {};
        sequenceCounter = data.sequenceCounter || 0;

        // If sequenceCounter is not restored, calculate from existing items
        if (sequenceCounter === 0 && Object.keys(queue).length > 0) {
          const maxSequence = Math.max(
            ...Object.values(queue).map((item) => item.sequenceNumber || 0),
          );
          sequenceCounter = maxSequence;
        }
      }
    } catch (error) {
      // Clear storage and initialize on error
      storage.removeItem(STORAGE_KEY);
      queue = {};
      sequenceCounter = 0;
    } finally {
      // Always ensure initialization completes
      initializePromise = null;
    }
  };

  // Load from storage (sync)
  const loadFromStorageSync = (): void => {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored) {
        // Only process synchronously if not encrypted
        if (!cryptoProvider.isEncrypted(stored)) {
          const data = JSON.parse(stored);
          queue = data.queue || {};
          sequenceCounter = data.sequenceCounter || 0;

          // If sequenceCounter is not restored, calculate from existing items
          if (sequenceCounter === 0 && Object.keys(queue).length > 0) {
            const maxSequence = Math.max(
              ...Object.values(queue).map((item) => item.sequenceNumber || 0),
            );
            sequenceCounter = maxSequence;
          }
        } else {
          // Initialize asynchronously if encrypted
          initializePromise = loadFromStorage().catch(() => {
            // Complete initialization even on error
            initializePromise = null;
          });
        }
      }
    } catch (error) {
      // Clear storage and initialize on error
      storage.removeItem(STORAGE_KEY);
      queue = {};
      sequenceCounter = 0;
      initializePromise = null;
    }
  };

  // Setup storage listener
  const setupStorageListener = (): void => {
    // Detect changes in other tabs
    storageEventHandler = storage.addEventListener((event) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        loadFromStorage();
      }
    });
  };

  // Initialize
  loadFromStorageSync();
  setupStorageListener();

  // Public API
  const enqueue = async (
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ): Promise<string> => {
    // Wait for initialization if not complete
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
      timestamp: timeProvider.getDate().toISOString(),
      sequenceNumber: ++sequenceCounter,
      retryCount: 0,
      status: "pending",
    };

    queue[id] = item;
    await saveToStorage();

    return id;
  };

  const dequeue = async (batchSize = 10): Promise<SyncQueueItem[]> => {
    const now = timeProvider.getDate().toISOString();
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
    item.lastRetryAt = timeProvider.getDate().toISOString();

    if (item.retryCount >= MAX_RETRY_COUNT) {
      delete queue[id];
    } else {
      // Apply exponential backoff
      const retryDelay = calculateRetryDelay(item.retryCount, isNetworkError);
      item.nextRetryAt = new Date(
        timeProvider.now() + retryDelay,
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
    const now = timeProvider.getDate().toISOString();
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

  // Return public API
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
