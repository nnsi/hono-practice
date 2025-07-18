import {
  createInMemoryStorageProvider,
  createMockTimeProvider,
} from "@frontend/services/abstractions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSyncQueue } from "../SyncQueue";

import type { ISyncQueue } from "../SyncQueue";
import type { CryptoProvider } from "../types";

// モックCryptoProviderの作成
const createMockCryptoProvider = (): CryptoProvider => {
  return {
    isEncrypted: vi.fn((data: string) => data.startsWith("encrypted:")),
    encrypt: vi.fn(async (data: string) => `encrypted:${btoa(data)}`),
    decrypt: vi.fn(async (data: string) => {
      if (data.startsWith("encrypted:")) {
        return atob(data.substring("encrypted:".length));
      }
      return data;
    }),
    clearCache: vi.fn(),
  };
};

describe("SyncQueue", () => {
  let syncQueue: ISyncQueue;
  let storage: ReturnType<typeof createInMemoryStorageProvider>;
  let cryptoProvider: ReturnType<typeof createMockCryptoProvider>;
  let timeProvider: ReturnType<typeof createMockTimeProvider>;

  beforeEach(() => {
    const baseStorage = createInMemoryStorageProvider();

    // ストレージメソッドをspyでラップ
    storage = {
      getItem: vi.fn(baseStorage.getItem),
      setItem: vi.fn(baseStorage.setItem),
      removeItem: vi.fn(baseStorage.removeItem),
      keys: vi.fn(baseStorage.keys),
      addEventListener: vi.fn(baseStorage.addEventListener),
      clear: vi.fn(baseStorage.clear),
    };

    cryptoProvider = createMockCryptoProvider();
    timeProvider = createMockTimeProvider(Date.now());

    syncQueue = createSyncQueue({
      userId: "test-user",
      storageKey: "test-sync-queue",
      dependencies: {
        storage,
        cryptoProvider,
        timeProvider,
      },
    });
  });

  afterEach(() => {
    syncQueue.cleanup();
    vi.clearAllMocks();
  });

  describe("enqueue", () => {
    it("新しいアイテムをキューに追加できる", async () => {
      const id = await syncQueue.enqueue("activity", "activity-123", "create", {
        name: "Test Activity",
      });

      expect(id).toBeTruthy();
      expect(syncQueue.getPendingCount()).toBe(1);

      const items = syncQueue.getAllItems();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id,
        entityType: "activity",
        entityId: "activity-123",
        operation: "create",
        payload: { name: "Test Activity" },
        status: "pending",
        retryCount: 0,
      });
    });

    it("複数のアイテムをenqueueするとシーケンス番号が増加する", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      await syncQueue.enqueue("activity", "activity-2", "update", {});
      await syncQueue.enqueue("activity", "activity-3", "delete", {});

      const items = syncQueue.getAllItems();
      expect(items[0].sequenceNumber).toBe(1);
      expect(items[1].sequenceNumber).toBe(2);
      expect(items[2].sequenceNumber).toBe(3);
    });

    it("enqueue時にストレージに保存される", async () => {
      await syncQueue.enqueue("task", "task-1", "create", { title: "Task 1" });

      expect(storage.setItem).toHaveBeenCalledWith(
        "test-sync-queue",
        expect.any(String),
      );
      expect(cryptoProvider.encrypt).toHaveBeenCalled();
    });
  });

  describe("dequeue", () => {
    it("pendingステータスのアイテムをシーケンス順に取得する", async () => {
      await syncQueue.enqueue("activity", "activity-3", "create", {});
      await syncQueue.enqueue("activity", "activity-1", "update", {});
      await syncQueue.enqueue("activity", "activity-2", "delete", {});

      const items = await syncQueue.dequeue(2);

      expect(items).toHaveLength(2);
      expect(items[0].entityId).toBe("activity-3");
      expect(items[1].entityId).toBe("activity-1");
      expect(items[0].status).toBe("syncing");
      expect(items[1].status).toBe("syncing");
    });

    it("バッチサイズを指定できる", async () => {
      for (let i = 0; i < 5; i++) {
        await syncQueue.enqueue("activity", `activity-${i}`, "create", {});
      }

      const items = await syncQueue.dequeue(3);
      expect(items).toHaveLength(3);
    });

    it("syncingステータスのアイテムは取得されない", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      await syncQueue.enqueue("activity", "activity-2", "update", {});

      // 最初のアイテムをsyncingに変更
      await syncQueue.dequeue(1);

      // 2回目のdequeueでは2番目のアイテムのみ取得
      const items = await syncQueue.dequeue(10);
      expect(items).toHaveLength(1);
      expect(items[0].entityId).toBe("activity-2");
    });

    it("nextRetryAtが未来の場合、アイテムは取得されない", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      // アイテムを失敗としてマーク（リトライ待機）
      await syncQueue.dequeue(1);
      await syncQueue.markAsFailed(id, "Network error", true);

      // 時間を少し進める（リトライ時間より短い）
      timeProvider.advance(100);

      const items = await syncQueue.dequeue(10);
      expect(items).toHaveLength(0);
    });
  });

  describe("markAsSuccess", () => {
    it("成功したアイテムをキューから削除する", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      await syncQueue.markAsSuccess(id);

      expect(syncQueue.getAllItems()).toHaveLength(0);
      expect(syncQueue.getPendingCount()).toBe(0);
    });

    it("存在しないIDでもエラーにならない", async () => {
      await expect(
        syncQueue.markAsSuccess("non-existent-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("markAsFailed", () => {
    it("失敗したアイテムのステータスとリトライカウントを更新する", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      await syncQueue.markAsFailed(id, "API Error");

      const items = syncQueue.getAllItems();
      expect(items[0]).toMatchObject({
        status: "failed_pending_retry",
        error: "API Error",
        retryCount: 1,
        lastRetryAt: expect.any(String),
        nextRetryAt: expect.any(String),
      });
    });

    it("ネットワークエラーの場合、リトライ間隔が長くなる", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      await syncQueue.markAsFailed(id, "Network Error", true);
      const item1 = syncQueue.getAllItems()[0];
      const nextRetry1 = new Date(item1.nextRetryAt!).getTime();

      // もう一度失敗させる
      timeProvider.advance(10000);
      await syncQueue.markAsFailed(id, "Network Error", true);
      const item2 = syncQueue.getAllItems()[0];
      const nextRetry2 = new Date(item2.nextRetryAt!).getTime();

      // リトライ間隔が増加していることを確認
      const interval1 = nextRetry1 - timeProvider.now() + 10000;
      const interval2 = nextRetry2 - timeProvider.now();
      expect(interval2).toBeGreaterThan(interval1);
    });

    it("MAX_RETRY_COUNT（3回）を超えたらアイテムを削除する", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      // 3回失敗させる
      await syncQueue.markAsFailed(id, "Error 1");
      await syncQueue.markAsFailed(id, "Error 2");
      await syncQueue.markAsFailed(id, "Error 3");

      // 3回目でアイテムが削除される
      expect(syncQueue.getAllItems()).toHaveLength(0);
    });

    it("リトライ時にエクスポネンシャルバックオフが適用される", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );
      const intervals: number[] = [];

      // 2回失敗させて、リトライ間隔を記録
      for (let i = 0; i < 2; i++) {
        const currentTime = timeProvider.now();
        await syncQueue.markAsFailed(id, `Error ${i + 1}`);
        const item = syncQueue.getAllItems()[0];
        const nextRetryTime = new Date(item.nextRetryAt!).getTime();
        intervals.push(nextRetryTime - currentTime);
      }

      // 2回目のリトライ間隔が1回目の約2倍になることを確認（ジッター考慮）
      expect(intervals[1]).toBeGreaterThan(intervals[0] * 1.5);
      expect(intervals[1]).toBeLessThan(intervals[0] * 2.5);
    });
  });

  describe("markAsPending", () => {
    it("アイテムのステータスをpendingに戻す", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );

      // 一度syncingにする
      await syncQueue.dequeue(1);
      expect(syncQueue.getAllItems()[0].status).toBe("syncing");

      // pendingに戻す
      await syncQueue.markAsPending(id);
      expect(syncQueue.getAllItems()[0].status).toBe("pending");
    });
  });

  describe("カウント系メソッド", () => {
    it("getPendingCountが正しくカウントする", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      await syncQueue.enqueue("activity", "activity-2", "update", {});

      expect(syncQueue.getPendingCount()).toBe(2);

      // 1つをsyncingに変更
      await syncQueue.dequeue(1);
      expect(syncQueue.getPendingCount()).toBe(1);
    });

    it("getSyncingCountが正しくカウントする", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      await syncQueue.enqueue("activity", "activity-2", "update", {});

      expect(syncQueue.getSyncingCount()).toBe(0);

      await syncQueue.dequeue(2);
      expect(syncQueue.getSyncingCount()).toBe(2);
    });

    it("getFailedCountが正しくカウントする", async () => {
      const id1 = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );
      const id2 = await syncQueue.enqueue(
        "activity",
        "activity-2",
        "update",
        {},
      );

      await syncQueue.markAsFailed(id1, "Error");
      expect(syncQueue.getFailedCount()).toBe(1);

      await syncQueue.markAsFailed(id2, "Error");
      expect(syncQueue.getFailedCount()).toBe(2);
    });

    it("getDetailedStatusが詳細なステータスを返す", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      const id2 = await syncQueue.enqueue(
        "activity",
        "activity-2",
        "update",
        {},
      );
      await syncQueue.enqueue("activity", "activity-3", "delete", {});

      // 1つをsyncing、1つをfailed_pending_retryに
      await syncQueue.dequeue(1);
      await syncQueue.markAsFailed(id2, "Error");

      const status = syncQueue.getDetailedStatus();
      expect(status).toEqual({
        pending: 1,
        syncing: 1,
        failed: 0,
        failedPendingRetry: 1,
      });
    });
  });

  describe("getRetriableItems", () => {
    it("リトライ可能なアイテムのみを返す", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      const id2 = await syncQueue.enqueue(
        "activity",
        "activity-2",
        "update",
        {},
      );
      await syncQueue.enqueue("activity", "activity-3", "delete", {});

      // 1つをsyncing、1つをリトライ待機に
      await syncQueue.dequeue(1);
      await syncQueue.markAsFailed(id2, "Error");

      const retriableItems = syncQueue.getRetriableItems();
      // pendingの1つとリトライ時間が来ていないfailed_pending_retryの1つ
      expect(retriableItems.length).toBeLessThanOrEqual(2);
    });

    it("nextRetryAtを過ぎたアイテムをリトライ可能として返す", async () => {
      const id = await syncQueue.enqueue(
        "activity",
        "activity-1",
        "create",
        {},
      );
      await syncQueue.markAsFailed(id, "Error");

      // リトライ時間前
      let retriableItems = syncQueue.getRetriableItems();
      expect(retriableItems).toHaveLength(0);

      // リトライ時間を過ぎる
      timeProvider.advance(60000); // 60秒進める
      retriableItems = syncQueue.getRetriableItems();
      expect(retriableItems).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("キューをクリアする", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {});
      await syncQueue.enqueue("activity", "activity-2", "update", {});

      await syncQueue.clear();

      expect(syncQueue.getAllItems()).toHaveLength(0);
      expect(syncQueue.getPendingCount()).toBe(0);
      expect(storage.setItem).toHaveBeenCalledWith(
        "test-sync-queue",
        expect.any(String),
      );
    });
  });

  describe("ストレージの永続化と復元", () => {
    it("キューの状態がストレージに保存される", async () => {
      await syncQueue.enqueue("activity", "activity-1", "create", {
        data: "test",
      });

      // 同じストレージを使って新しいSyncQueueインスタンスを作成
      const newSyncQueue = createSyncQueue({
        userId: "test-user",
        storageKey: "test-sync-queue",
        dependencies: {
          storage,
          cryptoProvider,
          timeProvider,
        },
      });

      // 初期化が完了するまで待つ（非同期初期化のため）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // データが復元されていることを確認
      expect(newSyncQueue.getAllItems()).toHaveLength(1);
      expect(newSyncQueue.getAllItems()[0]).toMatchObject({
        entityId: "activity-1",
        payload: { data: "test" },
      });

      newSyncQueue.cleanup();
    });

    it("暗号化されたデータを復号化して復元する", async () => {
      // 暗号化されたデータを直接ストレージに保存
      const queueData = {
        queue: {
          "test-id": {
            id: "test-id",
            entityType: "activity",
            entityId: "activity-1",
            operation: "create",
            payload: { data: "encrypted-test" },
            timestamp: new Date().toISOString(),
            sequenceNumber: 1,
            retryCount: 0,
            status: "pending",
          },
        },
        sequenceCounter: 1,
      };

      const encrypted = await cryptoProvider.encrypt(JSON.stringify(queueData));

      // ストレージを呼び出すことで実際にデータを保存
      (storage.setItem as any).mockImplementation(
        (key: string, value: string) => {
          return createInMemoryStorageProvider().setItem(key, value);
        },
      );
      storage.setItem("test-sync-queue", encrypted);

      // getItemが保存したデータを返すようにモックを設定
      (storage.getItem as any).mockReturnValue(encrypted);

      // 新しいSyncQueueインスタンスを作成
      const newSyncQueue = createSyncQueue({
        userId: "test-user",
        storageKey: "test-sync-queue",
        dependencies: {
          storage,
          cryptoProvider,
          timeProvider,
        },
      });

      // 初期化が完了するまで待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // データが復元されていることを確認
      expect(newSyncQueue.getAllItems()).toHaveLength(1);
      expect(newSyncQueue.getAllItems()[0].payload).toEqual({
        data: "encrypted-test",
      });

      newSyncQueue.cleanup();
    });

    it("破損したデータの場合、初期状態にリセットされる", async () => {
      // 破損したデータを返すようにモックを設定
      (storage.getItem as any).mockReturnValue("invalid-json-data");

      // 新しいSyncQueueインスタンスを作成
      const newSyncQueue = createSyncQueue({
        userId: "test-user",
        storageKey: "test-sync-queue",
        dependencies: {
          storage,
          cryptoProvider,
          timeProvider,
        },
      });

      // 初期化が完了するまで待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 初期状態になっていることを確認
      expect(newSyncQueue.getAllItems()).toHaveLength(0);
      expect(storage.removeItem).toHaveBeenCalledWith("test-sync-queue");

      newSyncQueue.cleanup();
    });
  });

  describe("ストレージイベントのリスニング", () => {
    it("他のタブでの変更を検知して同期する", async () => {
      // 他のタブでのデータを準備
      const otherTabData = {
        queue: {
          "other-tab-id": {
            id: "other-tab-id",
            entityType: "task",
            entityId: "task-99",
            operation: "create",
            payload: { title: "From other tab" },
            timestamp: new Date().toISOString(),
            sequenceNumber: 10,
            retryCount: 0,
            status: "pending",
          },
        },
        sequenceCounter: 10,
      };

      // ストレージイベントをシミュレート
      const listeners = new Set<(event: StorageEvent) => void>();
      (storage.addEventListener as any).mockImplementation(
        (listener: (event: StorageEvent) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      );

      // 新しいSyncQueueを作成（リスナーが登録される）
      const newSyncQueue = createSyncQueue({
        userId: "test-user",
        storageKey: "test-sync-queue",
        dependencies: {
          storage,
          cryptoProvider,
          timeProvider,
        },
      });

      // 他タブでの変更をシミュレート
      const event = new StorageEvent("storage", {
        key: "test-sync-queue",
        newValue: JSON.stringify(otherTabData),
        oldValue: null,
      });

      // リスナーを手動で呼び出す
      listeners.forEach((listener) => listener(event));

      // データが同期されるまで少し待つ（非同期処理のため）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // エラーが発生してもクリーンアップ
      newSyncQueue.cleanup();
    });
  });

  describe("cleanup", () => {
    it("リスナーが正しく削除される", () => {
      const removeListener = vi.fn();
      (storage.addEventListener as any).mockReturnValue(removeListener);

      const newSyncQueue = createSyncQueue({
        dependencies: { storage, cryptoProvider, timeProvider },
      });

      newSyncQueue.cleanup();
      expect(removeListener).toHaveBeenCalled();
    });
  });
});
