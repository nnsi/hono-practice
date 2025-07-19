import type { EntityType, SyncOperation, SyncQueueItem } from "./SyncQueue";
import type {
  EventBus,
  NetworkStatusManager,
  StorageProvider,
  TimeProvider,
} from "@frontend/services/abstractions";
import type { apiClient as defaultApiClient } from "@frontend/utils/apiClient";

/**
 * SyncManagerの依存関係
 */
export type SyncManagerDependencies = {
  /**
   * APIクライアント
   */
  apiClient: typeof defaultApiClient;

  /**
   * 同期キュー
   */
  syncQueue: ISyncQueue;

  /**
   * ストレージプロバイダー
   */
  storage: StorageProvider;

  /**
   * イベントバス
   */
  eventBus: EventBus;

  /**
   * タイムプロバイダー
   */
  timeProvider: TimeProvider;

  /**
   * ネットワーク状態マネージャー
   */
  networkStatusManager: NetworkStatusManager;
};

/**
 * 暗号化処理のインターフェース
 */
export type CryptoProvider = {
  /**
   * 文字列が暗号化されているかチェック
   */
  isEncrypted: (data: string) => boolean;

  /**
   * 文字列を暗号化
   */
  encrypt: (data: string, userId?: string) => Promise<string>;

  /**
   * 文字列を復号化
   */
  decrypt: (data: string, userId?: string) => Promise<string>;

  /**
   * キャッシュをクリア
   */
  clearCache: () => void;
};

/**
 * SyncQueueのインターフェース
 */
export type ISyncQueue = {
  /**
   * キューにアイテムを追加
   */
  enqueue: (
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ) => Promise<string>;

  /**
   * キューからアイテムを取得
   */
  dequeue: (batchSize?: number) => Promise<SyncQueueItem[]>;

  /**
   * 成功したアイテムをマーク
   */
  markAsSuccess: (id: string) => Promise<void>;

  /**
   * 失敗したアイテムをマーク
   */
  markAsFailed: (
    id: string,
    error: string,
    isNetworkError?: boolean,
  ) => Promise<void>;

  /**
   * Pendingステータスに戻す
   */
  markAsPending: (id: string) => Promise<void>;

  /**
   * Pendingステータスのアイテム数
   */
  getPendingCount: () => number;

  /**
   * Syncingステータスのアイテム数
   */
  getSyncingCount: () => number;

  /**
   * Failedステータスのアイテム数
   */
  getFailedCount: () => number;

  /**
   * Pendingアイテムがあるか
   */
  hasPendingItems: () => boolean;

  /**
   * キューをクリア
   */
  clear: () => Promise<void>;

  /**
   * 全てのアイテムを取得
   */
  getAllItems: () => SyncQueueItem[];

  /**
   * 詳細なステータスを取得
   */
  getDetailedStatus: () => {
    pending: number;
    syncing: number;
    failed: number;
    failedPendingRetry: number;
  };

  /**
   * リトライ可能なアイテムを取得
   */
  getRetriableItems: () => SyncQueueItem[];

  /**
   * クリーンアップ処理
   */
  cleanup: () => void;
};

/**
 * SyncQueueの依存関係
 */
export type SyncQueueDependencies = {
  /**
   * ストレージプロバイダー
   */
  storage: StorageProvider;

  /**
   * 暗号化プロバイダー
   */
  cryptoProvider: CryptoProvider;

  /**
   * タイムプロバイダー
   */
  timeProvider: TimeProvider;
};
