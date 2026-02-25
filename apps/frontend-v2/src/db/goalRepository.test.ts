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
      goals: createMockTable(),
      authState: createMockTable(),
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

import { goalRepository } from "./goalRepository";

describe("goalRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
    mockDb.authState.get.mockResolvedValue({ userId: "user-1" });
  });

  // ========== Create ==========
  describe("createGoal", () => {
    it("デフォルト値付きでGoalを作成する", async () => {
      const result = await goalRepository.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 10,
        startDate: "2024-06-01",
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.userId).toBe("user-1");
      expect(result.activityId).toBe("act-1");
      expect(result.dailyTargetQuantity).toBe(10);
      expect(result.startDate).toBe("2024-06-01");
      expect(result.endDate).toBeNull();
      expect(result.isActive).toBe(true);
      expect(result.description).toBe("");
      expect(result.currentBalance).toBe(0);
      expect(result.totalTarget).toBe(0);
      expect(result.totalActual).toBe(0);
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");
      expect(mockDb.goals.add).toHaveBeenCalledWith(result);
    });

    it("endDateとdescriptionを指定できる", async () => {
      const result = await goalRepository.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 5,
        startDate: "2024-06-01",
        endDate: "2024-12-31",
        description: "毎日5km走る",
      });

      expect(result.endDate).toBe("2024-12-31");
      expect(result.description).toBe("毎日5km走る");
    });

    it("authStateがない場合userIdは空文字になる", async () => {
      mockDb.authState.get.mockResolvedValue(undefined);

      const result = await goalRepository.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 10,
        startDate: "2024-06-01",
      });

      expect(result.userId).toBe("");
    });

    it("endDateにnullを明示的に渡した場合", async () => {
      const result = await goalRepository.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 10,
        startDate: "2024-06-01",
        endDate: null,
      });

      expect(result.endDate).toBeNull();
    });
  });

  // ========== Read ==========
  describe("getAllGoals", () => {
    it("deletedAtがないGoalを全件返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "g1", activityId: "act-1" }]);
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.goals.filter.mockImplementation(mockFilter);

      const result = await goalRepository.getAllGoals();

      expect(result).toEqual([{ id: "g1", activityId: "act-1" }]);
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01" })).toBe(false);
    });
  });

  // ========== Update ==========
  describe("updateGoal", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      await goalRepository.updateGoal("goal-1", {
        dailyTargetQuantity: 20,
        isActive: false,
      });

      expect(mockDb.goals.update).toHaveBeenCalledWith("goal-1", {
        dailyTargetQuantity: 20,
        isActive: false,
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });

    it("単一フィールドの更新", async () => {
      await goalRepository.updateGoal("goal-1", {
        description: "更新された説明",
      });

      expect(mockDb.goals.update).toHaveBeenCalledWith("goal-1", {
        description: "更新された説明",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Delete ==========
  describe("softDeleteGoal", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      await goalRepository.softDeleteGoal("goal-1");

      expect(mockDb.goals.update).toHaveBeenCalledWith("goal-1", {
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncGoals", () => {
    it("_syncStatus=pendingのGoalsを返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "g1", _syncStatus: "pending" }]);
      const mockEquals = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.goals.where.mockReturnValue({ equals: mockEquals });

      const result = await goalRepository.getPendingSyncGoals();

      expect(mockDb.goals.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(result).toEqual([{ id: "g1", _syncStatus: "pending" }]);
    });
  });

  describe("markGoalsSynced", () => {
    it("指定IDのGoalsをsynced状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.goals.where.mockReturnValue({ anyOf: mockAnyOf });

      await goalRepository.markGoalsSynced(["g1", "g2"]);

      expect(mockDb.goals.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["g1", "g2"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "synced" });
    });

    it("空配列の場合は何もしない", async () => {
      await goalRepository.markGoalsSynced([]);
      expect(mockDb.goals.where).not.toHaveBeenCalled();
    });
  });

  describe("markGoalsFailed", () => {
    it("指定IDのGoalsをfailed状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.goals.where.mockReturnValue({ anyOf: mockAnyOf });

      await goalRepository.markGoalsFailed(["g1"]);

      expect(mockDb.goals.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["g1"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "failed" });
    });

    it("空配列の場合は何もしない", async () => {
      await goalRepository.markGoalsFailed([]);
      expect(mockDb.goals.where).not.toHaveBeenCalled();
    });
  });

  // ========== Server upsert ==========
  describe("upsertGoalsFromServer", () => {
    it("サーバーデータをsynced状態でbulkPutする", async () => {
      const goals = [
        { id: "g1", activityId: "act-1", dailyTargetQuantity: 10 },
        { id: "g2", activityId: "act-2", dailyTargetQuantity: 5 },
      ] as any[];

      await goalRepository.upsertGoalsFromServer(goals);

      expect(mockDb.goals.bulkPut).toHaveBeenCalledWith([
        {
          id: "g1",
          activityId: "act-1",
          dailyTargetQuantity: 10,
          _syncStatus: "synced",
        },
        {
          id: "g2",
          activityId: "act-2",
          dailyTargetQuantity: 5,
          _syncStatus: "synced",
        },
      ]);
    });
  });
});
