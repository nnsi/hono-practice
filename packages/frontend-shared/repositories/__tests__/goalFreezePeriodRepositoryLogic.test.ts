import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GoalFreezePeriodDbAdapter } from "../goalFreezePeriodRepositoryLogic";
import { newGoalFreezePeriodRepository } from "../goalFreezePeriodRepositoryLogic";

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidCounter}`),
}));

let uuidCounter = 0;

function createInMemoryAdapter() {
  const store = new Map<string, Syncable<GoalFreezePeriodRecord>>();
  let userId: string | undefined = "user-1";

  const adapter: GoalFreezePeriodDbAdapter = {
    async getUserId() {
      if (!userId)
        throw new Error("Cannot create goal freeze period: userId is not set");
      return userId;
    },
    async insert(period) {
      store.set(period.id, period);
    },
    async getByGoalId(goalId) {
      return [...store.values()].filter((p) => p.goalId === goalId);
    },
    async getAll(filter) {
      return [...store.values()].filter(filter);
    },
    async update(id, changes) {
      const existing = store.get(id);
      if (existing)
        store.set(id, {
          ...existing,
          ...changes,
        } as Syncable<GoalFreezePeriodRecord>);
    },
    async getByIds(ids) {
      return ids
        .map((id) => store.get(id))
        .filter((p): p is Syncable<GoalFreezePeriodRecord> => p !== undefined);
    },
    async updateSyncStatus(ids, status) {
      for (const id of ids) {
        const p = store.get(id);
        if (p) store.set(id, { ...p, _syncStatus: status });
      }
    },
    async bulkUpsertSynced(periods) {
      for (const p of periods) store.set(p.id, p);
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

describe("goalFreezePeriodRepositoryLogic", () => {
  let adapter: ReturnType<typeof createInMemoryAdapter>;
  let repo: ReturnType<typeof newGoalFreezePeriodRepository>;

  beforeEach(() => {
    uuidCounter = 0;
    adapter = createInMemoryAdapter();
    repo = newGoalFreezePeriodRepository(adapter.adapter);
  });

  // ========== Create ==========
  describe("createGoalFreezePeriod", () => {
    it("デフォルト値付きで作成する", async () => {
      const result = await repo.createGoalFreezePeriod({
        goalId: "goal-1",
        startDate: "2024-06-01",
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.goalId).toBe("goal-1");
      expect(result.userId).toBe("user-1");
      expect(result.startDate).toBe("2024-06-01");
      expect(result.endDate).toBeNull();
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");

      // storeに保存されていることを確認
      const stored = adapter.store.get("mock-uuid-1");
      expect(stored).toEqual(result);
    });

    it("endDateを指定できる", async () => {
      const result = await repo.createGoalFreezePeriod({
        goalId: "goal-1",
        startDate: "2024-06-01",
        endDate: "2024-06-15",
      });

      expect(result.endDate).toBe("2024-06-15");
    });

    it("authStateがない場合エラーを投げる", async () => {
      adapter.setUserId(undefined);

      await expect(
        repo.createGoalFreezePeriod({
          goalId: "goal-1",
          startDate: "2024-06-01",
        }),
      ).rejects.toThrow("Cannot create goal freeze period: userId is not set");
    });
  });

  // ========== Read ==========
  describe("getFreezePeriodsByGoalId", () => {
    it("指定goalIdのFreezePeriodを返す", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };

      adapter.store.set("fp1", { ...base, id: "fp1", goalId: "goal-1" });
      adapter.store.set("fp2", { ...base, id: "fp2", goalId: "goal-2" });
      adapter.store.set("fp3", { ...base, id: "fp3", goalId: "goal-1" });

      const result = await repo.getFreezePeriodsByGoalId("goal-1");

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(["fp1", "fp3"]);
    });
  });

  // ========== Update ==========
  describe("updateGoalFreezePeriod", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("fp1", base);

      await repo.updateGoalFreezePeriod("fp1", {
        startDate: "2024-07-01",
        endDate: "2024-07-15",
      });

      const updated = adapter.store.get("fp1")!;
      expect(updated.startDate).toBe("2024-07-01");
      expect(updated.endDate).toBe("2024-07-15");
      expect(updated._syncStatus).toBe("pending");
      expect(updated.updatedAt).not.toBe("2024-06-01T00:00:00Z");
    });
  });

  // ========== Delete ==========
  describe("softDeleteGoalFreezePeriod", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("fp1", base);

      await repo.softDeleteGoalFreezePeriod("fp1");

      const deleted = adapter.store.get("fp1")!;
      expect(deleted.deletedAt).toEqual(expect.any(String));
      expect(deleted.updatedAt).not.toBe("2024-06-01T00:00:00Z");
      expect(deleted._syncStatus).toBe("pending");
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncFreezePeriods", () => {
    it("_syncStatus=pendingのFreezePeriodを返す", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", { ...base, id: "fp1", _syncStatus: "pending" });
      adapter.store.set("fp2", { ...base, id: "fp2", _syncStatus: "synced" });
      adapter.store.set("fp3", { ...base, id: "fp3", _syncStatus: "failed" });

      const result = await repo.getPendingSyncFreezePeriods();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("fp1");
    });
  });

  describe("markFreezePeriodsSynced", () => {
    it("指定IDのFreezePeriodsをsynced状態にする", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", { ...base, id: "fp1" });
      adapter.store.set("fp2", { ...base, id: "fp2" });

      await repo.markFreezePeriodsSynced(["fp1", "fp2"]);

      expect(adapter.store.get("fp1")!._syncStatus).toBe("synced");
      expect(adapter.store.get("fp2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", base);

      await repo.markFreezePeriodsSynced([]);

      expect(adapter.store.get("fp1")!._syncStatus).toBe("pending");
    });
  });

  describe("markFreezePeriodsFailed", () => {
    it("指定IDのFreezePeriodsをfailed状態にする", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", { ...base, id: "fp1" });

      await repo.markFreezePeriodsFailed(["fp1"]);

      expect(adapter.store.get("fp1")!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", base);

      await repo.markFreezePeriodsFailed([]);

      expect(adapter.store.get("fp1")!._syncStatus).toBe("pending");
    });
  });

  // ========== Server upsert ==========
  describe("upsertFreezePeriodsFromServer", () => {
    it("サーバーデータをsynced状態でupsertする", async () => {
      const periods: GoalFreezePeriodRecord[] = [
        {
          id: "fp1",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-06-01",
          endDate: "2024-06-15",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "fp2",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-07-01",
          endDate: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertFreezePeriodsFromServer(periods);

      expect(adapter.store.get("fp1")!._syncStatus).toBe("synced");
      expect(adapter.store.get("fp1")!.endDate).toBe("2024-06-15");
      expect(adapter.store.get("fp2")!._syncStatus).toBe("synced");
      expect(adapter.store.get("fp2")!.endDate).toBeNull();
    });

    it("pendingレコードを上書きしない", async () => {
      const localPeriod: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: "2024-06-10",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", localPeriod);

      const serverPeriods: GoalFreezePeriodRecord[] = [
        {
          id: "fp1",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-06-01",
          endDate: "2024-06-20",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "fp2",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-07-01",
          endDate: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertFreezePeriodsFromServer(serverPeriods);

      // fp1はpendingなので上書きされない
      expect(adapter.store.get("fp1")!.endDate).toBe("2024-06-10");
      expect(adapter.store.get("fp1")!._syncStatus).toBe("pending");
      // fp2は新規なのでupsertされる
      expect(adapter.store.get("fp2")!._syncStatus).toBe("synced");
    });

    it("全レコードがpendingの場合bulkUpsertをスキップする", async () => {
      const base: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      };
      adapter.store.set("fp1", { ...base, id: "fp1" });
      adapter.store.set("fp2", { ...base, id: "fp2" });

      const bulkUpsertSpy = vi.spyOn(adapter.adapter, "bulkUpsertSynced");

      const serverPeriods: GoalFreezePeriodRecord[] = [
        { ...base, id: "fp1" },
        { ...base, id: "fp2" },
      ];

      await repo.upsertFreezePeriodsFromServer(serverPeriods);

      expect(bulkUpsertSpy).not.toHaveBeenCalled();
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      const localPeriod: Syncable<GoalFreezePeriodRecord> = {
        id: "fp1",
        goalId: "goal-1",
        userId: "user-1",
        startDate: "2024-06-01",
        endDate: "2024-06-10",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      };
      adapter.store.set("fp1", localPeriod);

      const serverPeriods: GoalFreezePeriodRecord[] = [
        {
          id: "fp1",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-06-01",
          endDate: "2024-06-20",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "fp2",
          goalId: "goal-1",
          userId: "user-1",
          startDate: "2024-07-01",
          endDate: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertFreezePeriodsFromServer(serverPeriods);

      // fp1はローカルが新しいので上書きされない
      expect(adapter.store.get("fp1")!.endDate).toBe("2024-06-10");
      // fp2は新規なのでupsertされる
      expect(adapter.store.get("fp2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合何もしない", async () => {
      const getByIdsSpy = vi.spyOn(adapter.adapter, "getByIds");
      const bulkUpsertSpy = vi.spyOn(adapter.adapter, "bulkUpsertSynced");

      await repo.upsertFreezePeriodsFromServer([]);

      expect(getByIdsSpy).not.toHaveBeenCalled();
      expect(bulkUpsertSpy).not.toHaveBeenCalled();
    });
  });
});
