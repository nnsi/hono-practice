import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted で vi.mock ファクトリ内から参照できるモックを作成
const { mockDb, uuidState } = vi.hoisted(() => {
  function createMockCollection() {
    return {
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      modify: vi.fn().mockResolvedValue(undefined),
    };
  }

  function createMockTable() {
    const mockCollection = createMockCollection();
    return {
      add: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue(mockCollection),
        anyOf: vi.fn().mockReturnValue(mockCollection),
      }),
      orderBy: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      filter: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    };
  }

  const state = { counter: 0 };

  return {
    mockDb: {
      activities: createMockTable(),
      activityKinds: createMockTable(),
      activityIconBlobs: createMockTable(),
      activityIconDeleteQueue: createMockTable(),
      authState: createMockTable(),
      transaction: vi.fn(
        (_mode: string, _tables: unknown[], fn: () => unknown) => fn(),
      ),
    },
    uuidState: state,
  };
});

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidState.counter}`),
}));

vi.mock("./schema", () => ({
  db: mockDb,
}));

import { activityRepository } from "./activityRepository";
import { db } from "./schema";

describe("activityRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
    mockDb.authState.get.mockResolvedValue({ userId: "user-1" });
  });

  // ========== Read ==========
  describe("getAllActivities", () => {
    it("orderByしてdeletedAtがないものだけ返す", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ id: "a1", name: "Running" }]),
      });
      mockDb.activities.orderBy.mockReturnValue({
        filter: mockFilter,
      });

      const result = await activityRepository.getAllActivities();

      expect(mockDb.activities.orderBy).toHaveBeenCalledWith("orderIndex");
      expect(result).toEqual([{ id: "a1", name: "Running" }]);
      // filterのコールバックがdeletedAtをチェックしている
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01" })).toBe(false);
    });
  });

  describe("getActivityKindsByActivityId", () => {
    it("activityIdでwhereしてdeletedAtなしをフィルタする", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ id: "k1", name: "Kind1" }]),
      });
      const mockEquals = vi.fn().mockReturnValue({ filter: mockFilter });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      const result =
        await activityRepository.getActivityKindsByActivityId("act-1");

      expect(mockDb.activityKinds.where).toHaveBeenCalledWith("activityId");
      expect(mockEquals).toHaveBeenCalledWith("act-1");
      expect(result).toEqual([{ id: "k1", name: "Kind1" }]);
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01" })).toBe(false);
    });
  });

  describe("getAllActivityKinds", () => {
    it("deletedAtなしのActivityKindsを全件返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "k1" }, { id: "k2" }]);
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.activityKinds.filter.mockImplementation(mockFilter);

      const result = await activityRepository.getAllActivityKinds();

      expect(result).toEqual([{ id: "k1" }, { id: "k2" }]);
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01" })).toBe(false);
    });
  });

  // ========== Create ==========
  describe("createActivity", () => {
    it("Kindsなしで新しいActivityを作成する", async () => {
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await activityRepository.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "🏃",
        showCombinedStats: false,
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Running");
      expect(result.quantityUnit).toBe("km");
      expect(result.emoji).toBe("🏃");
      expect(result.iconType).toBe("emoji");
      expect(result.orderIndex).toMatch(/^[a-z]{8}$/);
      expect(result.showCombinedStats).toBe(false);
      expect(result._syncStatus).toBe("pending");
      expect(result.deletedAt).toBeNull();
      expect(mockDb.activities.add).toHaveBeenCalledWith(result);
      expect(mockDb.activityKinds.bulkAdd).not.toHaveBeenCalled();
    });

    it("既存Activityがある場合orderIndexが加算される", async () => {
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ orderIndex: "000003" }),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await activityRepository.createActivity({
        name: "Study",
        quantityUnit: "min",
        emoji: "📚",
        showCombinedStats: true,
      });

      expect(result.orderIndex).toBe("000004");
    });

    it("Kindsありでの作成", async () => {
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      await activityRepository.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "💪",
        showCombinedStats: false,
        kinds: [
          { name: "Push-ups", color: "#ff0000" },
          { name: "Sit-ups", color: "#00ff00" },
        ],
      });

      expect(mockDb.activityKinds.bulkAdd).toHaveBeenCalledTimes(1);
      const addedKinds = mockDb.activityKinds.bulkAdd.mock.calls[0][0];
      expect(addedKinds).toHaveLength(2);
      expect(addedKinds[0].name).toBe("Push-ups");
      expect(addedKinds[0].color).toBe("#ff0000");
      expect(addedKinds[0].orderIndex).toBe("000000");
      expect(addedKinds[0]._syncStatus).toBe("pending");
      expect(addedKinds[1].name).toBe("Sit-ups");
      expect(addedKinds[1].orderIndex).toBe("000001");
    });

    it("Kindsのcolorが空文字の場合nullになる", async () => {
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      await activityRepository.createActivity({
        name: "Test",
        quantityUnit: "回",
        emoji: "✅",
        showCombinedStats: false,
        kinds: [{ name: "Kind1", color: "" }],
      });

      const addedKinds = mockDb.activityKinds.bulkAdd.mock.calls[0][0];
      expect(addedKinds[0].color).toBeNull();
    });

    it("authStateがない場合userIdは空文字になる", async () => {
      mockDb.authState.get.mockResolvedValue(undefined);
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await activityRepository.createActivity({
        name: "Test",
        quantityUnit: "回",
        emoji: "🎯",
        showCombinedStats: false,
      });

      expect(result.userId).toBe("");
    });

    it("iconTypeを指定できる", async () => {
      mockDb.activities.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await activityRepository.createActivity({
        name: "Photo",
        quantityUnit: "枚",
        emoji: "",
        showCombinedStats: false,
        iconType: "upload",
      });

      expect(result.iconType).toBe("upload");
    });
  });

  // ========== Update ==========
  describe("updateActivity", () => {
    it("基本的な更新（kindsなし）", async () => {
      await activityRepository.updateActivity("act-1", { name: "Walking" });

      expect(mockDb.activities.update).toHaveBeenCalledWith("act-1", {
        name: "Walking",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });

    it("updatedKindsがあり既存kindの更新・削除・新規追加を行う", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { id: "k1", name: "Old1" },
          { id: "k2", name: "Old2" },
        ]),
      });
      const mockEquals = vi.fn().mockReturnValue({ filter: mockFilter });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      await activityRepository.updateActivity("act-1", { name: "Updated" }, [
        { id: "k1", name: "Updated1", color: "#aaa" },
        { name: "NewKind", color: "#bbb" },
      ]);

      // k2がsoft-deleteされる
      expect(mockDb.activityKinds.update).toHaveBeenCalledWith("k2", {
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });

      // k1が更新される
      expect(mockDb.activityKinds.update).toHaveBeenCalledWith("k1", {
        name: "Updated1",
        color: "#aaa",
        orderIndex: "000000",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });

      // 新規kindが追加される
      expect(mockDb.activityKinds.add).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: "act-1",
          name: "NewKind",
          color: "#bbb",
          orderIndex: "000001",
          _syncStatus: "pending",
        }),
      );
    });

    it("updatedKindsがundefinedの場合kinds操作をスキップする", async () => {
      await activityRepository.updateActivity("act-1", { emoji: "🏃" });

      expect(mockDb.activityKinds.where).not.toHaveBeenCalled();
    });
  });

  // ========== Delete ==========
  describe("softDeleteActivity", () => {
    it("Activity自体と関連するActivityKindsをsoft-deleteする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockEquals = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      await activityRepository.softDeleteActivity("act-1");

      expect(mockDb.activities.update).toHaveBeenCalledWith("act-1", {
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });

      expect(mockDb.activityKinds.where).toHaveBeenCalledWith("activityId");
      expect(mockEquals).toHaveBeenCalledWith("act-1");
      expect(mockModify).toHaveBeenCalledWith({
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncActivities", () => {
    it("_syncStatus=pendingのActivitiesを返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "a1", _syncStatus: "pending" }]);
      const mockEquals = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.activities.where.mockReturnValue({ equals: mockEquals });

      const result = await activityRepository.getPendingSyncActivities();

      expect(mockDb.activities.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(result).toEqual([{ id: "a1", _syncStatus: "pending" }]);
    });
  });

  describe("getPendingSyncActivityKinds", () => {
    it("_syncStatus=pendingのActivityKindsを返す", async () => {
      const mockToArray = vi.fn().mockResolvedValue([{ id: "k1" }]);
      const mockEquals = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      const result = await activityRepository.getPendingSyncActivityKinds();

      expect(mockDb.activityKinds.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(result).toEqual([{ id: "k1" }]);
    });
  });

  describe("markActivitiesSynced", () => {
    it("指定IDのActivitiesをsynced状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activities.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityRepository.markActivitiesSynced(["a1", "a2"]);

      expect(mockDb.activities.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["a1", "a2"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "synced" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityRepository.markActivitiesSynced([]);
      expect(mockDb.activities.where).not.toHaveBeenCalled();
    });
  });

  describe("markActivityKindsSynced", () => {
    it("指定IDのActivityKindsをsynced状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activityKinds.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityRepository.markActivityKindsSynced(["k1"]);

      expect(mockDb.activityKinds.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["k1"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "synced" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityRepository.markActivityKindsSynced([]);
      expect(mockDb.activityKinds.where).not.toHaveBeenCalled();
    });
  });

  describe("markActivitiesFailed", () => {
    it("指定IDのActivitiesをfailed状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activities.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityRepository.markActivitiesFailed(["a1"]);

      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "failed" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityRepository.markActivitiesFailed([]);
      expect(mockDb.activities.where).not.toHaveBeenCalled();
    });
  });

  describe("markActivityKindsFailed", () => {
    it("指定IDのActivityKindsをfailed状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activityKinds.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityRepository.markActivityKindsFailed(["k1"]);

      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "failed" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityRepository.markActivityKindsFailed([]);
      expect(mockDb.activityKinds.where).not.toHaveBeenCalled();
    });
  });

  // ========== Icon blob management ==========
  describe("saveActivityIconBlob", () => {
    it("アイコンBlobデータを保存する", async () => {
      await activityRepository.saveActivityIconBlob(
        "act-1",
        "base64data",
        "image/png",
      );

      expect(mockDb.activityIconBlobs.put).toHaveBeenCalledWith({
        activityId: "act-1",
        base64: "base64data",
        mimeType: "image/png",
      });
    });
  });

  describe("getActivityIconBlob", () => {
    it("指定activityIdのBlobを取得する", async () => {
      mockDb.activityIconBlobs.get.mockResolvedValue({
        activityId: "act-1",
        base64: "data",
        mimeType: "image/png",
      });

      const result = await activityRepository.getActivityIconBlob("act-1");

      expect(mockDb.activityIconBlobs.get).toHaveBeenCalledWith("act-1");
      expect(result).toEqual({
        activityId: "act-1",
        base64: "data",
        mimeType: "image/png",
      });
    });
  });

  describe("deleteActivityIconBlob", () => {
    it("指定activityIdのBlobを削除する", async () => {
      await activityRepository.deleteActivityIconBlob("act-1");
      expect(mockDb.activityIconBlobs.delete).toHaveBeenCalledWith("act-1");
    });
  });

  describe("getPendingIconBlobs", () => {
    it("syncedでないBlobのみ返す", async () => {
      mockDb.activityIconBlobs.toArray.mockResolvedValue([
        { activityId: "act-1", synced: false },
        { activityId: "act-2", synced: true },
        { activityId: "act-3" },
      ]);

      const result = await activityRepository.getPendingIconBlobs();
      expect(result).toEqual([
        { activityId: "act-1", synced: false },
        { activityId: "act-3" },
      ]);
    });
  });

  describe("getAllIconBlobs", () => {
    it("synced含め全Blobを返す", async () => {
      mockDb.activityIconBlobs.toArray.mockResolvedValue([
        { activityId: "act-1", synced: true },
        { activityId: "act-2" },
      ]);

      const result = await activityRepository.getAllIconBlobs();
      expect(result).toEqual([
        { activityId: "act-1", synced: true },
        { activityId: "act-2" },
      ]);
    });
  });

  describe("completeActivityIconSync", () => {
    it("トランザクション内でiconUrlを更新しBlobをsynced状態にする", async () => {
      await activityRepository.completeActivityIconSync(
        "act-1",
        "https://example.com/icon.png",
        "https://example.com/icon-thumb.png",
      );

      expect(db.transaction).toHaveBeenCalledWith(
        "rw",
        [db.activities, db.activityIconBlobs],
        expect.any(Function),
      );
      expect(mockDb.activities.update).toHaveBeenCalledWith("act-1", {
        iconUrl: "https://example.com/icon.png",
        iconThumbnailUrl: "https://example.com/icon-thumb.png",
        _syncStatus: "pending",
      });
      expect(mockDb.activityIconBlobs.update).toHaveBeenCalledWith("act-1", {
        synced: true,
      });
    });
  });

  describe("clearActivityIcon", () => {
    it("トランザクション内でアイコンをクリアしBlob削除+削除キューに追加する", async () => {
      await activityRepository.clearActivityIcon("act-1");

      expect(db.transaction).toHaveBeenCalledWith(
        "rw",
        [db.activities, db.activityIconBlobs, db.activityIconDeleteQueue],
        expect.any(Function),
      );
      expect(mockDb.activities.update).toHaveBeenCalledWith("act-1", {
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
      expect(mockDb.activityIconBlobs.delete).toHaveBeenCalledWith("act-1");
      expect(mockDb.activityIconDeleteQueue.put).toHaveBeenCalledWith({
        activityId: "act-1",
      });
    });
  });

  describe("getPendingIconDeletes", () => {
    it("削除キューの全件を返す", async () => {
      mockDb.activityIconDeleteQueue.toArray.mockResolvedValue([
        { activityId: "act-1" },
      ]);

      const result = await activityRepository.getPendingIconDeletes();
      expect(result).toEqual([{ activityId: "act-1" }]);
    });
  });

  describe("removeIconDeleteQueue", () => {
    it("指定activityIdを削除キューから取り除く", async () => {
      await activityRepository.removeIconDeleteQueue("act-1");
      expect(mockDb.activityIconDeleteQueue.delete).toHaveBeenCalledWith(
        "act-1",
      );
    });
  });

  // ========== Server upsert ==========
  describe("upsertActivities", () => {
    it("サーバーデータをsynced状態でbulkPutする", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue([]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activities.where.mockReturnValue({ equals: mockEquals });

      const activities = [
        { id: "a1", name: "Running" },
        { id: "a2", name: "Study" },
      ] as any[];

      await activityRepository.upsertActivities(activities);

      expect(mockDb.activities.bulkPut).toHaveBeenCalledWith([
        { id: "a1", name: "Running", _syncStatus: "synced" },
        { id: "a2", name: "Study", _syncStatus: "synced" },
      ]);
    });

    it("pendingレコードを上書きしない", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue(["a1"]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activities.where.mockReturnValue({ equals: mockEquals });

      const activities = [
        { id: "a1", name: "Running" },
        { id: "a2", name: "Study" },
      ] as any[];

      await activityRepository.upsertActivities(activities);

      expect(mockDb.activities.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(mockDb.activities.bulkPut).toHaveBeenCalledWith([
        { id: "a2", name: "Study", _syncStatus: "synced" },
      ]);
    });

    it("全レコードがpendingの場合bulkPutをスキップする", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue(["a1", "a2"]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activities.where.mockReturnValue({ equals: mockEquals });

      const activities = [
        { id: "a1", name: "Running" },
        { id: "a2", name: "Study" },
      ] as any[];

      await activityRepository.upsertActivities(activities);

      expect(mockDb.activities.bulkPut).not.toHaveBeenCalled();
    });
  });

  describe("upsertActivityKinds", () => {
    it("サーバーデータをsynced状態でbulkPutする", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue([]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      const kinds = [{ id: "k1", name: "Kind1" }] as any[];

      await activityRepository.upsertActivityKinds(kinds);

      expect(mockDb.activityKinds.bulkPut).toHaveBeenCalledWith([
        { id: "k1", name: "Kind1", _syncStatus: "synced" },
      ]);
    });

    it("pendingレコードを上書きしない", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue(["k1"]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      const kinds = [
        { id: "k1", name: "Kind1" },
        { id: "k2", name: "Kind2" },
      ] as any[];

      await activityRepository.upsertActivityKinds(kinds);

      expect(mockDb.activityKinds.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(mockDb.activityKinds.bulkPut).toHaveBeenCalledWith([
        { id: "k2", name: "Kind2", _syncStatus: "synced" },
      ]);
    });

    it("全レコードがpendingの場合bulkPutをスキップする", async () => {
      const mockPrimaryKeys = vi.fn().mockResolvedValue(["k1"]);
      const mockEquals = vi.fn().mockReturnValue({
        primaryKeys: mockPrimaryKeys,
      });
      mockDb.activityKinds.where.mockReturnValue({ equals: mockEquals });

      const kinds = [{ id: "k1", name: "Kind1" }] as any[];

      await activityRepository.upsertActivityKinds(kinds);

      expect(mockDb.activityKinds.bulkPut).not.toHaveBeenCalled();
    });
  });
});
