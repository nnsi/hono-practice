import { beforeEach, describe, expect, it, vi } from "vitest";

import { newSyncRepository } from "../syncRepository";

import type { QueryExecutor } from "@backend/infra/rdb/drizzle/drizzleInstance";

describe("SyncRepository", () => {
  let mockQueryExecutor: QueryExecutor;
  let syncRepository: ReturnType<typeof newSyncRepository>;

  beforeEach(() => {
    // モックの初期化
    mockQueryExecutor = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
      transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          select: mockQueryExecutor.select,
          insert: mockQueryExecutor.insert,
          update: mockQueryExecutor.update,
          delete: mockQueryExecutor.delete,
        };
        return await callback(tx);
      }),
    } as any;

    syncRepository = newSyncRepository(mockQueryExecutor);
  });

  describe("findDuplicatesByTimestamps", () => {
    it("重複チェック結果を返す", async () => {
      const mockExistingOps = [
        {
          id: "00000000-0000-4000-8000-000000000201",
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create",
          payload: JSON.stringify({ name: "Test" }),
          timestamp: new Date("2024-01-01T10:00:00Z"),
          sequenceNumber: "1",
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockQueryExecutor.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockExistingOps),
        }),
      } as any);

      const results = await syncRepository.findDuplicatesByTimestamps(
        "user-123",
        [
          {
            entityType: "activity",
            entityId: "activity-1",
            timestamp: new Date("2024-01-01T10:00:00.500Z"),
            operation: "create",
          },
        ],
      );

      expect(results).toHaveLength(1);
      expect(results[0].isDuplicate).toBe(true);
    });
  });

  describe("getSyncStatus", () => {
    it("同期状況を集計して返す", async () => {
      const mockMetadata = [
        { status: "pending" },
        { status: "pending" },
        { status: "syncing" },
        { status: "synced", lastSyncedAt: new Date("2024-01-01") },
        { status: "failed" },
      ];

      vi.mocked(mockQueryExecutor.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMetadata),
        }),
      } as any);

      const status = await syncRepository.getSyncStatus("user-123");

      expect(status.pendingCount).toBe(2);
      expect(status.syncingCount).toBe(1);
      expect(status.syncedCount).toBe(1);
      expect(status.failedCount).toBe(1);
      expect(status.lastSyncedAt).toEqual(new Date("2024-01-01"));
    });
  });

  describe("enqueueSync", () => {
    it("同期キューに操作を追加する", async () => {
      const operations = [
        {
          userId: "user-123",
          entityType: "activity",
          entityId: "activity-1",
          operation: "create" as const,
          payload: { name: "Test Activity" },
          timestamp: new Date(),
          sequenceNumber: 1,
        },
      ];

      const result = await syncRepository.enqueueSync(operations);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe("activity");
      expect(result[0].operation).toBe("create");
      expect(mockQueryExecutor.transaction).toHaveBeenCalled();
    });
  });

  describe("dequeueSyncBatch", () => {
    it("バッチサイズに応じてキューアイテムを取得する", async () => {
      const mockQueueItems = Array.from({ length: 51 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${(i + 300).toString().padStart(12, "0")}`,
        userId: "user-123",
        entityType: "activity",
        entityId: `activity-${i}`,
        operation: "create",
        payload: JSON.stringify({}),
        timestamp: new Date(),
        sequenceNumber: i.toString(),
        createdAt: new Date(),
      }));

      vi.mocked(mockQueryExecutor.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockQueueItems),
          }),
        }),
      } as any);

      const batch = await syncRepository.dequeueSyncBatch("user-123", 50);

      expect(batch.items).toHaveLength(50);
      expect(batch.hasMore).toBe(true);
      expect(batch.totalCount).toBe(50);
    });
  });

  describe("markAsSynced", () => {
    it("同期完了のマーキングを行う", async () => {
      const queueIds = [
        "00000000-0000-4000-8000-000000000501",
        "00000000-0000-4000-8000-000000000502",
      ];

      // モックの設定
      vi.mocked(mockQueryExecutor.select).mockImplementation(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as any,
      );

      await syncRepository.markAsSynced(queueIds as any);

      expect(mockQueryExecutor.transaction).toHaveBeenCalled();
    });
  });

  describe("getMetadataByEntity", () => {
    it("エンティティに対応するメタデータを取得する", async () => {
      const mockMetadata = {
        id: "00000000-0000-4000-8000-000000000601",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-1",
        status: "synced",
        lastSyncedAt: new Date(),
        errorMessage: null,
        retryCount: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockQueryExecutor.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockMetadata]),
          }),
        }),
      } as any);

      const result = await syncRepository.getMetadataByEntity(
        "user-123",
        "activity",
        "activity-1",
      );

      expect(result).not.toBeNull();
      expect(result?.entityType).toBe("activity");
      expect(result?.status).toBe("synced");
    });

    it("存在しない場合はnullを返す", async () => {
      vi.mocked(mockQueryExecutor.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await syncRepository.getMetadataByEntity(
        "user-123",
        "activity",
        "nonexistent",
      );

      expect(result).toBeNull();
    });
  });
});
