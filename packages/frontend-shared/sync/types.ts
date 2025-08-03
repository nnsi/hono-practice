// Sync types
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

// Interfaces
export type ISyncQueue = {
  enqueue: (
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ) => Promise<string>;
  dequeue: (batchSize?: number) => Promise<SyncQueueItem[]>;
  markAsSuccess: (id: string) => Promise<void>;
  markAsFailed: (
    id: string,
    error: string,
    isNetworkError?: boolean,
  ) => Promise<void>;
  markAsPending: (id: string) => Promise<void>;
  getPendingCount: () => number;
  getSyncingCount: () => number;
  getFailedCount: () => number;
  hasPendingItems: () => boolean;
  clear: () => Promise<void>;
  getAllItems: () => SyncQueueItem[];
  getDetailedStatus: () => {
    pending: number;
    syncing: number;
    failed: number;
    failedPendingRetry: number;
  };
  getRetriableItems: () => SyncQueueItem[];
  cleanup: () => void;
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

// Time provider adapter - extends TimerAdapter with additional methods
export type TimeProviderAdapter<T = unknown> = {
  // From TimerAdapter
  setInterval: (callback: () => void, ms: number) => T;
  clearInterval: (id: T) => void;
  // Additional methods needed for sync
  now: () => number;
  getDate: () => Date;
  sleep: (ms: number) => Promise<void>;
};

// Crypto provider for encryption/decryption
export type CryptoProvider = {
  isEncrypted: (data: string) => boolean;
  encrypt: (data: string, userId?: string) => Promise<string>;
  decrypt: (data: string, userId?: string) => Promise<string>;
  clearCache: () => void;
};

// Sync API client interface
export type SyncApiClient = {
  users: {
    sync: {
      batch: {
        $post: (options: {
          json: BatchSyncRequest;
        }) => Promise<Response>;
      };
      "check-duplicates": {
        $post: (options: {
          json: {
            operations: Array<{
              entityType: EntityType;
              entityId: string;
              operation: SyncOperation;
              timestamp: string;
            }>;
          };
        }) => Promise<Response>;
      };
      pull: {
        $get: (options: {
          query: Record<string, string>;
        }) => Promise<Response>;
      };
    };
  };
};
