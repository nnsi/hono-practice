import { describe, it, expect, vi, beforeEach } from "vitest";

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
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue(mockCollection),
        anyOf: vi.fn().mockReturnValue(mockCollection),
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
      activityLogs: createMockTable(),
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

import { activityLogRepository } from "./activityLogRepository";

describe("activityLogRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
  });

  // ========== Create ==========
  describe("createActivityLog", () => {
    it("新しいActivityLogを作成する", async () => {
      const input = {
        activityId: "act-1",
        activityKindId: "kind-1",
        quantity: 5,
        memo: "朝ラン",
        date: "2024-06-01",
        time: "08:00",
      };

      const result = await activityLogRepository.createActivityLog(input);

      expect(result.id).toBe("mock-uuid-1");
      expect(result.activityId).toBe("act-1");
      expect(result.activityKindId).toBe("kind-1");
      expect(result.quantity).toBe(5);
      expect(result.memo).toBe("朝ラン");
      expect(result.date).toBe("2024-06-01");
      expect(result.time).toBe("08:00");
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");
      expect(mockDb.activityLogs.add).toHaveBeenCalledWith(result);
    });

    it("activityKindIdがnullの場合", async () => {
      const input = {
        activityId: "act-1",
        activityKindId: null,
        quantity: 10,
        memo: "",
        date: "2024-06-01",
        time: null,
      };

      const result = await activityLogRepository.createActivityLog(input);

      expect(result.activityKindId).toBeNull();
      expect(result.time).toBeNull();
    });
  });

  // ========== Read ==========
  describe("getActivityLogsByDate", () => {
    it("指定日付のdeletedAtなしログを返す", async () => {
      const mockFilter = vi.fn().mockReturnValue({
        toArray: vi
          .fn()
          .mockResolvedValue([{ id: "log-1", date: "2024-06-01" }]),
      });
      const mockEquals = vi.fn().mockReturnValue({ filter: mockFilter });
      mockDb.activityLogs.where.mockReturnValue({ equals: mockEquals });

      const result =
        await activityLogRepository.getActivityLogsByDate("2024-06-01");

      expect(mockDb.activityLogs.where).toHaveBeenCalledWith("date");
      expect(mockEquals).toHaveBeenCalledWith("2024-06-01");
      expect(result).toEqual([{ id: "log-1", date: "2024-06-01" }]);

      // filterコールバックがdeletedAt===nullをチェック
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01" })).toBe(false);
    });
  });

  // ========== Update ==========
  describe("updateActivityLog", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      await activityLogRepository.updateActivityLog("log-1", {
        quantity: 10,
        memo: "更新メモ",
      });

      expect(mockDb.activityLogs.update).toHaveBeenCalledWith("log-1", {
        quantity: 10,
        memo: "更新メモ",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });

    it("単一フィールドの更新", async () => {
      await activityLogRepository.updateActivityLog("log-1", {
        date: "2024-07-01",
      });

      expect(mockDb.activityLogs.update).toHaveBeenCalledWith("log-1", {
        date: "2024-07-01",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Delete ==========
  describe("softDeleteActivityLog", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      await activityLogRepository.softDeleteActivityLog("log-1");

      expect(mockDb.activityLogs.update).toHaveBeenCalledWith("log-1", {
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncActivityLogs", () => {
    it("_syncStatus=pendingのログを返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "log-1", _syncStatus: "pending" }]);
      const mockEquals = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.activityLogs.where.mockReturnValue({ equals: mockEquals });

      const result = await activityLogRepository.getPendingSyncActivityLogs();

      expect(mockDb.activityLogs.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(result).toEqual([{ id: "log-1", _syncStatus: "pending" }]);
    });
  });

  describe("markActivityLogsSynced", () => {
    it("指定IDのログをsynced状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activityLogs.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityLogRepository.markActivityLogsSynced(["log-1", "log-2"]);

      expect(mockDb.activityLogs.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["log-1", "log-2"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "synced" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityLogRepository.markActivityLogsSynced([]);
      expect(mockDb.activityLogs.where).not.toHaveBeenCalled();
    });
  });

  describe("markActivityLogsFailed", () => {
    it("指定IDのログをfailed状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.activityLogs.where.mockReturnValue({ anyOf: mockAnyOf });

      await activityLogRepository.markActivityLogsFailed(["log-1"]);

      expect(mockDb.activityLogs.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["log-1"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "failed" });
    });

    it("空配列の場合は何もしない", async () => {
      await activityLogRepository.markActivityLogsFailed([]);
      expect(mockDb.activityLogs.where).not.toHaveBeenCalled();
    });
  });

  // ========== Server upsert ==========
  describe("upsertActivityLogsFromServer", () => {
    it("サーバーデータをsynced状態でbulkPutする", async () => {
      const logs = [
        { id: "log-1", activityId: "act-1", date: "2024-06-01" },
        { id: "log-2", activityId: "act-2", date: "2024-06-02" },
      ] as any[];

      await activityLogRepository.upsertActivityLogsFromServer(logs);

      expect(mockDb.activityLogs.bulkPut).toHaveBeenCalledWith([
        {
          id: "log-1",
          activityId: "act-1",
          date: "2024-06-01",
          _syncStatus: "synced",
        },
        {
          id: "log-2",
          activityId: "act-2",
          date: "2024-06-02",
          _syncStatus: "synced",
        },
      ]);
    });
  });
});
