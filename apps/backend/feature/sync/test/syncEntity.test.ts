import {
  createSyncMetadataEntity,
  createSyncQueueEntity,
  markAsSynced,
  markAsSyncing,
  markAsFailed,
  canRetrySync,
  checkForDuplicates,
  sortBySequence,
  groupByEntityType,
} from "@backend/domain/sync";
import { describe, expect, it } from "vitest";

describe("SyncMetadataEntity", () => {
  describe("createSyncMetadataEntity", () => {
    it("デフォルト値でエンティティを作成できる", () => {
      const entity = createSyncMetadataEntity({
        id: "test-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
      });

      expect(entity.id).toBe("test-id");
      expect(entity.userId).toBe("user-123");
      expect(entity.entityType).toBe("activity");
      expect(entity.entityId).toBe("activity-456");
      expect(entity.status).toBe("pending");
      expect(entity.lastSyncedAt).toBeNull();
      expect(entity.errorMessage).toBeNull();
      expect(entity.retryCount).toBe(0);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it("カスタム値でエンティティを作成できる", () => {
      const now = new Date();
      const entity = createSyncMetadataEntity({
        id: "test-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
        status: "synced",
        lastSyncedAt: now,
        errorMessage: "Test error",
        retryCount: 2,
      });

      expect(entity.status).toBe("synced");
      expect(entity.lastSyncedAt).toEqual(now);
      expect(entity.errorMessage).toBe("Test error");
      expect(entity.retryCount).toBe(2);
    });
  });

  describe("canRetrySync", () => {
    it("失敗状態でリトライ回数が上限未満の場合はtrueを返す", () => {
      const entity = createSyncMetadataEntity({
        id: "test-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
        status: "failed",
        retryCount: 2,
      });

      expect(canRetrySync(entity, 3)).toBe(true);
    });

    it("失敗状態でリトライ回数が上限に達している場合はfalseを返す", () => {
      const entity = createSyncMetadataEntity({
        id: "test-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
        status: "failed",
        retryCount: 3,
      });

      expect(canRetrySync(entity, 3)).toBe(false);
    });

    it("成功状態の場合はfalseを返す", () => {
      const entity = createSyncMetadataEntity({
        id: "test-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
        status: "synced",
        retryCount: 0,
      });

      expect(canRetrySync(entity, 3)).toBe(false);
    });
  });

  describe("状態変更ヘルパー関数", () => {
    const baseEntity = createSyncMetadataEntity({
      id: "test-id",
      userId: "user-123",
      entityType: "activity",
      entityId: "activity-456",
    });

    it("markAsSyncingで同期中状態に変更できる", () => {
      const updated = markAsSyncing(baseEntity);
      expect(updated.status).toBe("syncing");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        baseEntity.updatedAt.getTime()
      );
    });

    it("markAsSyncedで同期済み状態に変更できる", () => {
      const updated = markAsSynced(baseEntity);
      expect(updated.status).toBe("synced");
      expect(updated.lastSyncedAt).toBeInstanceOf(Date);
      expect(updated.errorMessage).toBeNull();
      expect(updated.retryCount).toBe(0);
    });

    it("markAsFailedで失敗状態に変更できる", () => {
      const updated = markAsFailed(baseEntity, "Connection error");
      expect(updated.status).toBe("failed");
      expect(updated.errorMessage).toBe("Connection error");
      expect(updated.retryCount).toBe(1);
    });
  });
});

describe("SyncQueueEntity", () => {
  describe("createSyncQueueEntity", () => {
    it("エンティティを作成できる", () => {
      const now = new Date();
      const entity = createSyncQueueEntity({
        id: "queue-id",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-456",
        operation: "create",
        payload: { name: "Test Activity" },
        timestamp: now,
        sequenceNumber: 1,
      });

      expect(entity.id).toBe("queue-id");
      expect(entity.userId).toBe("user-123");
      expect(entity.entityType).toBe("activity");
      expect(entity.entityId).toBe("activity-456");
      expect(entity.operation).toBe("create");
      expect(entity.payload).toEqual({ name: "Test Activity" });
      expect(entity.timestamp).toEqual(now);
      expect(entity.sequenceNumber).toBe(1);
      expect(entity.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("ヘルパー関数", () => {
    const entities = [
      createSyncQueueEntity({
        id: "1",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-1",
        operation: "create",
        payload: {},
        timestamp: new Date(),
        sequenceNumber: 3,
      }),
      createSyncQueueEntity({
        id: "2",
        userId: "user-123",
        entityType: "task",
        entityId: "task-1",
        operation: "update",
        payload: {},
        timestamp: new Date(),
        sequenceNumber: 1,
      }),
      createSyncQueueEntity({
        id: "3",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-2",
        operation: "delete",
        payload: {},
        timestamp: new Date(),
        sequenceNumber: 2,
      }),
    ];

    it("sortBySequenceでシーケンス番号順にソートできる", () => {
      const sorted = sortBySequence(entities);
      expect(sorted[0].sequenceNumber).toBe(1);
      expect(sorted[1].sequenceNumber).toBe(2);
      expect(sorted[2].sequenceNumber).toBe(3);
    });

    it("groupByEntityTypeでエンティティタイプごとにグループ化できる", () => {
      const grouped = groupByEntityType(entities);
      expect(grouped.activity).toHaveLength(2);
      expect(grouped.task).toHaveLength(1);
      expect(grouped.activity[0].entityType).toBe("activity");
      expect(grouped.task[0].entityType).toBe("task");
    });
  });

  describe("checkForDuplicates", () => {
    const existingOperations = [
      createSyncQueueEntity({
        id: "1",
        userId: "user-123",
        entityType: "activity",
        entityId: "activity-1",
        operation: "create",
        payload: {},
        timestamp: new Date("2024-01-01T10:00:00Z"),
        sequenceNumber: 1,
      }),
    ];

    it("同じエンティティ・操作・タイムスタンプの場合は重複と判定する", () => {
      const result = checkForDuplicates(
        {
          entityType: "activity",
          entityId: "activity-1",
          operation: "create",
          timestamp: new Date("2024-01-01T10:00:00.500Z"), // 500ms差
        },
        existingOperations
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.conflictingOperations).toHaveLength(1);
    });

    it("タイムスタンプが許容範囲外の場合は重複と判定しない", () => {
      const result = checkForDuplicates(
        {
          entityType: "activity",
          entityId: "activity-1",
          operation: "create",
          timestamp: new Date("2024-01-01T10:00:02Z"), // 2秒差
        },
        existingOperations
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.conflictingOperations).toBeUndefined();
    });

    it("異なる操作の場合は重複と判定しない", () => {
      const result = checkForDuplicates(
        {
          entityType: "activity",
          entityId: "activity-1",
          operation: "update",
          timestamp: new Date("2024-01-01T10:00:00Z"),
        },
        existingOperations
      );

      expect(result.isDuplicate).toBe(false);
    });
  });
});