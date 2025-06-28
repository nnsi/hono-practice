import { beforeEach, describe, expect, it, vi } from "vitest";

import { newSyncUsecase } from "../syncUsecase";

import type { SyncRepository } from "../syncRepository";
import type {
  DuplicateCheckResult,
  SyncQueueEntity,
} from "@backend/domain/sync";

describe("SyncUseCase", () => {
  let mockRepository: SyncRepository;
  let syncUseCase: ReturnType<typeof newSyncUsecase>;

  beforeEach(() => {
    // モックリポジトリの初期化
    mockRepository = {
      findDuplicatesByTimestamps: vi.fn(),
      getSyncStatus: vi.fn(),
      enqueueSync: vi.fn(),
      dequeueSyncBatch: vi.fn(),
      markAsSynced: vi.fn(),
      getMetadataByEntity: vi.fn(),
      updateSyncMetadata: vi.fn(),
      getQueueByIds: vi.fn(),
      deleteQueueItems: vi.fn(),
    } as any;

    syncUseCase = newSyncUsecase(mockRepository);
  });

  describe("checkDuplicates", () => {
    it("重複チェック結果を返す", async () => {
      const operations = [
        {
          entityType: "activity",
          entityId: "activity-1",
          timestamp: new Date(),
          operation: "create" as const,
        },
      ];

      const mockResults: DuplicateCheckResult[] = [{ isDuplicate: false }];

      vi.mocked(mockRepository.findDuplicatesByTimestamps).mockResolvedValue(
        mockResults,
      );

      const results = await syncUseCase.checkDuplicates("user-123", operations);

      expect(results).toEqual(mockResults);
      expect(mockRepository.findDuplicatesByTimestamps).toHaveBeenCalledWith(
        "user-123",
        operations,
      );
    });
  });

  describe("getSyncStatus", () => {
    it("同期状況にパーセンテージを追加して返す", async () => {
      const mockStatus = {
        pendingCount: 10,
        syncingCount: 5,
        syncedCount: 85,
        failedCount: 0,
        lastSyncedAt: new Date(),
      };

      vi.mocked(mockRepository.getSyncStatus).mockResolvedValue(mockStatus);

      const result = await syncUseCase.getSyncStatus("user-123");

      expect(result.totalCount).toBe(100);
      expect(result.syncPercentage).toBe(85);
      expect(result.pendingCount).toBe(10);
      expect(result.syncingCount).toBe(5);
      expect(result.syncedCount).toBe(85);
      expect(result.failedCount).toBe(0);
    });

    it("データがない場合は100%を返す", async () => {
      const mockStatus = {
        pendingCount: 0,
        syncingCount: 0,
        syncedCount: 0,
        failedCount: 0,
        lastSyncedAt: null,
      };

      vi.mocked(mockRepository.getSyncStatus).mockResolvedValue(mockStatus);

      const result = await syncUseCase.getSyncStatus("user-123");

      expect(result.totalCount).toBe(0);
      expect(result.syncPercentage).toBe(100);
    });
  });

  describe("processSyncQueue", () => {
    it("同期キューを処理する", async () => {
      const mockQueueItems: SyncQueueEntity[] = [
        {
          id: "queue-1" as any,
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create",
          payload: { name: "Test" },
          timestamp: new Date(),
          sequenceNumber: 1,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockRepository.dequeueSyncBatch).mockResolvedValue({
        items: mockQueueItems,
        totalCount: 1,
        hasMore: false,
      });

      vi.mocked(mockRepository.getMetadataByEntity).mockResolvedValue(null);
      vi.mocked(mockRepository.deleteQueueItems).mockResolvedValue(undefined);

      const result = await syncUseCase.processSyncQueue("user-123");

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(mockRepository.deleteQueueItems).toHaveBeenCalledWith(["queue-1"]);
    });

    it("エラーが発生した場合は失敗としてカウントする", async () => {
      const mockQueueItems: SyncQueueEntity[] = [
        {
          id: "queue-1" as any,
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create",
          payload: { name: "Test" },
          timestamp: new Date(),
          sequenceNumber: 1,
          createdAt: new Date(),
        },
      ];

      const mockMetadata = {
        id: "metadata-1" as any,
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-1",
        status: "pending" as const,
        lastSyncedAt: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.dequeueSyncBatch).mockResolvedValue({
        items: mockQueueItems,
        totalCount: 1,
        hasMore: false,
      });

      vi.mocked(mockRepository.getMetadataByEntity)
        .mockResolvedValueOnce(mockMetadata)
        .mockResolvedValueOnce(mockMetadata);

      // simulateSyncOperationをモックしてエラーを発生させる
      const originalTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation(() => {
        throw new Error("Simulated sync error");
      }) as any;

      const result = await syncUseCase.processSyncQueue("user-123");

      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(mockRepository.updateSyncMetadata).toHaveBeenCalledWith(
        "metadata-1",
        expect.objectContaining({
          status: "failed",
          errorMessage: "Simulated sync error",
          retryCount: 1,
        }),
      );

      global.setTimeout = originalTimeout;
    });
  });

  describe("enqueueSyncOperations", () => {
    it("重複していない操作のみエンキューする", async () => {
      const operations = [
        {
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create" as const,
          payload: { name: "Test" },
          timestamp: new Date(),
          sequenceNumber: 1,
        },
        {
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-2",
          operation: "create" as const,
          payload: { name: "Test 2" },
          timestamp: new Date(),
          sequenceNumber: 2,
        },
      ];

      const mockDuplicateResults: DuplicateCheckResult[] = [
        { isDuplicate: true, conflictingOperations: [] },
        { isDuplicate: false },
      ];

      vi.mocked(mockRepository.findDuplicatesByTimestamps).mockResolvedValue(
        mockDuplicateResults,
      );

      const mockEnqueuedOperations: SyncQueueEntity[] = [
        {
          id: "queue-2" as any,
          ...operations[1],
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockRepository.enqueueSync).mockResolvedValue(
        mockEnqueuedOperations,
      );

      const result = await syncUseCase.enqueueSyncOperations(operations);

      expect(result).toHaveLength(1);
      expect(result[0].entityId).toBe("activity-2");
      expect(mockRepository.enqueueSync).toHaveBeenCalledWith([operations[1]]);
    });

    it("全て重複している場合は空配列を返す", async () => {
      const operations = [
        {
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create" as const,
          payload: { name: "Test" },
          timestamp: new Date(),
          sequenceNumber: 1,
        },
      ];

      const mockDuplicateResults: DuplicateCheckResult[] = [
        { isDuplicate: true, conflictingOperations: [] },
      ];

      vi.mocked(mockRepository.findDuplicatesByTimestamps).mockResolvedValue(
        mockDuplicateResults,
      );

      const result = await syncUseCase.enqueueSyncOperations(operations);

      expect(result).toEqual([]);
      expect(mockRepository.enqueueSync).not.toHaveBeenCalled();
    });
  });
});
