import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { resetServerTimeForTests } from "@packages/sync-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GoalDbAdapter } from "../goalRepositoryLogic";
import { newGoalRepository } from "../goalRepositoryLogic";

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidCounter}`),
}));

let uuidCounter = 0;

function createInMemoryAdapter() {
  const store = new Map<string, Syncable<GoalRecord>>();
  let userId: string | undefined = "user-1";

  const adapter: GoalDbAdapter = {
    async getUserId() {
      if (!userId) throw new Error("Cannot create goal: userId is not set");
      return userId;
    },
    async insert(goal) {
      store.set(goal.id, goal);
    },
    async getAll(filter) {
      return [...store.values()].filter(filter);
    },
    async update(id, changes) {
      const existing = store.get(id);
      if (existing)
        store.set(id, { ...existing, ...changes } as Syncable<GoalRecord>);
    },
    async getByIds(ids) {
      return ids
        .map((id) => store.get(id))
        .filter((g): g is Syncable<GoalRecord> => g !== undefined);
    },
    async updateSyncStatus(ids, status) {
      for (const id of ids) {
        const g = store.get(id);
        if (g) store.set(id, { ...g, _syncStatus: status });
      }
    },
    async bulkUpsertSynced(goals) {
      for (const g of goals) store.set(g.id, g);
    },
  };

  return {
    adapter,
    store,
    setUserId: (id: string | undefined) => {
      userId = id;
    },
  };
}

describe("goalRepositoryLogic", () => {
  let adapter: ReturnType<typeof createInMemoryAdapter>;
  let repo: ReturnType<typeof newGoalRepository>;

  beforeEach(() => {
    uuidCounter = 0;
    resetServerTimeForTests();
    adapter = createInMemoryAdapter();
    repo = newGoalRepository(adapter.adapter);
  });

  // ========== Create ==========
  describe("createGoal", () => {
    it("デフォルト値付きでGoalを作成する", async () => {
      const result = await repo.createGoal({
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
      expect(result.dayTargets).toBeNull();
      expect(result.debtCap).toBeNull();
      expect(result.currentBalance).toBe(0);
      expect(result.totalTarget).toBe(0);
      expect(result.totalActual).toBe(0);
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");

      // storeに保存されていることを確認
      const stored = adapter.store.get("mock-uuid-1");
      expect(stored).toEqual(result);
    });

    it("endDateとdescriptionを指定できる", async () => {
      const result = await repo.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 5,
        startDate: "2024-06-01",
        endDate: "2024-12-31",
        description: "毎日5km走る",
      });

      expect(result.endDate).toBe("2024-12-31");
      expect(result.description).toBe("毎日5km走る");
    });

    it("authStateがない場合エラーを投げる", async () => {
      adapter.setUserId(undefined);

      await expect(
        repo.createGoal({
          activityId: "act-1",
          dailyTargetQuantity: 10,
          startDate: "2024-06-01",
        }),
      ).rejects.toThrow("Cannot create goal: userId is not set");
    });

    it("endDateにnullを明示的に渡した場合", async () => {
      const result = await repo.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 10,
        startDate: "2024-06-01",
        endDate: null,
      });

      expect(result.endDate).toBeNull();
    });

    it("dayTargetsとdebtCapを指定できる", async () => {
      const dayTargets = { 1: 10, 5: 20 } as const;
      const result = await repo.createGoal({
        activityId: "act-1",
        dailyTargetQuantity: 10,
        startDate: "2024-06-01",
        dayTargets,
        debtCap: 50,
      });

      expect(result.dayTargets).toEqual(dayTargets);
      expect(result.debtCap).toBe(50);
    });
  });

  // ========== Read ==========
  describe("getAllGoals", () => {
    it("deletedAtがないGoalをstartDate降順で返す", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };

      adapter.store.set("g1", { ...base, id: "g1", startDate: "2024-01-01" });
      adapter.store.set("g2", { ...base, id: "g2", startDate: "2024-06-01" });
      adapter.store.set("g3", { ...base, id: "g3", startDate: "2024-03-01" });
      adapter.store.set("g4", {
        ...base,
        id: "g4",
        startDate: "2024-12-01",
        deletedAt: "2024-12-15T00:00:00Z",
      });

      const result = await repo.getAllGoals();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("g2"); // 2024-06-01
      expect(result[1].id).toBe("g3"); // 2024-03-01
      expect(result[2].id).toBe("g1"); // 2024-01-01
    });
  });

  // ========== Update ==========
  describe("updateGoal", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      const base: Syncable<GoalRecord> = {
        id: "goal-1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("goal-1", base);

      await repo.updateGoal("goal-1", {
        dailyTargetQuantity: 20,
        isActive: false,
      });

      const updated = adapter.store.get("goal-1")!;
      expect(updated.dailyTargetQuantity).toBe(20);
      expect(updated.isActive).toBe(false);
      expect(updated._syncStatus).toBe("pending");
      expect(updated.updatedAt).not.toBe("2024-01-01T00:00:00Z");
    });

    it("単一フィールドの更新", async () => {
      const base: Syncable<GoalRecord> = {
        id: "goal-1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("goal-1", base);

      await repo.updateGoal("goal-1", {
        description: "更新された説明",
      });

      const updated = adapter.store.get("goal-1")!;
      expect(updated.description).toBe("更新された説明");
      expect(updated._syncStatus).toBe("pending");
      // 他のフィールドは変更されない
      expect(updated.dailyTargetQuantity).toBe(10);
      expect(updated.isActive).toBe(true);
    });
  });

  // ========== Delete ==========
  describe("softDeleteGoal", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      const base: Syncable<GoalRecord> = {
        id: "goal-1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("goal-1", base);

      await repo.softDeleteGoal("goal-1");

      const deleted = adapter.store.get("goal-1")!;
      expect(deleted.deletedAt).toEqual(expect.any(String));
      expect(deleted.updatedAt).not.toBe("2024-01-01T00:00:00Z");
      expect(deleted._syncStatus).toBe("pending");
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncGoals", () => {
    it("_syncStatus=pendingのGoalsを返す", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, id: "g1", _syncStatus: "pending" });
      adapter.store.set("g2", { ...base, id: "g2", _syncStatus: "synced" });
      adapter.store.set("g3", { ...base, id: "g3", _syncStatus: "failed" });

      const result = await repo.getPendingSyncGoals();

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.id).sort()).toEqual(["g1", "g3"]);
    });
  });

  describe("markGoalsSynced", () => {
    it("指定IDのGoalsをsynced状態にする", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, id: "g1", _syncStatus: "pending" });
      adapter.store.set("g2", { ...base, id: "g2", _syncStatus: "pending" });

      await repo.markGoalsSynced(["g1", "g2"]);

      expect(adapter.store.get("g1")!._syncStatus).toBe("synced");
      expect(adapter.store.get("g2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, _syncStatus: "pending" });

      await repo.markGoalsSynced([]);

      // pendingのまま変わらない
      expect(adapter.store.get("g1")!._syncStatus).toBe("pending");
    });
  });

  describe("markGoalsFailed", () => {
    it("指定IDのGoalsをfailed状態にする", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, id: "g1", _syncStatus: "pending" });

      await repo.markGoalsFailed(["g1"]);

      expect(adapter.store.get("g1")!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, _syncStatus: "pending" });

      await repo.markGoalsFailed([]);

      expect(adapter.store.get("g1")!._syncStatus).toBe("pending");
    });
  });

  // ========== Server upsert ==========
  describe("upsertGoalsFromServer", () => {
    it("サーバーデータをsynced状態でupsertする", async () => {
      const goals: GoalRecord[] = [
        {
          id: "g1",
          userId: "user-1",
          activityId: "act-1",
          dailyTargetQuantity: 10,
          dayTargets: null,
          startDate: "2024-01-01",
          endDate: null,
          isActive: true,
          description: "",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "g2",
          userId: "user-1",
          activityId: "act-2",
          dailyTargetQuantity: 5,
          dayTargets: null,
          startDate: "2024-02-01",
          endDate: null,
          isActive: true,
          description: "",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertGoalsFromServer(goals);

      expect(adapter.store.get("g1")!._syncStatus).toBe("synced");
      expect(adapter.store.get("g1")!.activityId).toBe("act-1");
      expect(adapter.store.get("g2")!._syncStatus).toBe("synced");
      expect(adapter.store.get("g2")!.activityId).toBe("act-2");
    });

    it("pendingレコードを上書きしない", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "ローカル変更",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", base);

      const serverGoals: GoalRecord[] = [
        {
          id: "g1",
          userId: "user-1",
          activityId: "act-1",
          dailyTargetQuantity: 10,
          dayTargets: null,
          startDate: "2024-01-01",
          endDate: null,
          isActive: true,
          description: "サーバー側の値",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "g2",
          userId: "user-1",
          activityId: "act-2",
          dailyTargetQuantity: 5,
          dayTargets: null,
          startDate: "2024-02-01",
          endDate: null,
          isActive: true,
          description: "",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertGoalsFromServer(serverGoals);

      // g1はpendingなので上書きされない
      expect(adapter.store.get("g1")!.description).toBe("ローカル変更");
      expect(adapter.store.get("g1")!._syncStatus).toBe("pending");
      // g2は新規なのでupsertされる
      expect(adapter.store.get("g2")!._syncStatus).toBe("synced");
    });

    it("全レコードがpendingの場合bulkUpsertをスキップする", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("g1", { ...base, id: "g1" });
      adapter.store.set("g2", { ...base, id: "g2" });

      const serverGoals: GoalRecord[] = [
        {
          ...base,
          id: "g1",
        },
        {
          ...base,
          id: "g2",
        },
      ];

      const bulkUpsertSpy = vi.spyOn(adapter.adapter, "bulkUpsertSynced");

      await repo.upsertGoalsFromServer(serverGoals);

      expect(bulkUpsertSpy).not.toHaveBeenCalled();
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      const base: Syncable<GoalRecord> = {
        id: "g1",
        userId: "user-1",
        activityId: "act-1",
        dailyTargetQuantity: 10,
        dayTargets: null,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "ローカル最新",
        debtCap: null,
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("g1", base);

      const serverGoals: GoalRecord[] = [
        {
          id: "g1",
          userId: "user-1",
          activityId: "act-1",
          dailyTargetQuantity: 10,
          dayTargets: null,
          startDate: "2024-01-01",
          endDate: null,
          isActive: true,
          description: "サーバー古い",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "g2",
          userId: "user-1",
          activityId: "act-2",
          dailyTargetQuantity: 5,
          dayTargets: null,
          startDate: "2024-02-01",
          endDate: null,
          isActive: true,
          description: "",
          debtCap: null,
          currentBalance: 0,
          totalTarget: 0,
          totalActual: 0,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertGoalsFromServer(serverGoals);

      // g1はローカルが新しいので上書きされない
      expect(adapter.store.get("g1")!.description).toBe("ローカル最新");
      // g2は新規なのでupsertされる
      expect(adapter.store.get("g2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合何もしない", async () => {
      const getByIdsSpy = vi.spyOn(adapter.adapter, "getByIds");
      const bulkUpsertSpy = vi.spyOn(adapter.adapter, "bulkUpsertSynced");

      await repo.upsertGoalsFromServer([]);

      expect(getByIdsSpy).not.toHaveBeenCalled();
      expect(bulkUpsertSpy).not.toHaveBeenCalled();
    });
  });
});
