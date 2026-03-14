import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityLogDbAdapter } from "../activityLogRepositoryLogic";

const uuidState = { counter: 0 };

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidState.counter}`),
}));

import { newActivityLogRepository } from "../activityLogRepositoryLogic";

type LocalActivityLog = Omit<ActivityLogRecord, "userId">;

function createInMemoryAdapter() {
  const store = new Map<string, Syncable<LocalActivityLog>>();

  const adapter: ActivityLogDbAdapter = {
    async insert(log) {
      store.set(log.id, log);
    },
    async getAll(filter) {
      return [...store.values()].filter(filter);
    },
    async getByDate(date) {
      return [...store.values()].filter((l) => l.date === date && !l.deletedAt);
    },
    async getByDateRange(start, end) {
      return [...store.values()].filter(
        (l) => l.date >= start && l.date <= end && !l.deletedAt,
      );
    },
    async update(id, changes) {
      const existing = store.get(id);
      if (existing)
        store.set(id, {
          ...existing,
          ...changes,
        } as Syncable<LocalActivityLog>);
    },
    async getByIds(ids) {
      return ids
        .map((id) => store.get(id))
        .filter((l): l is Syncable<LocalActivityLog> => l !== undefined);
    },
    async updateSyncStatus(ids, status) {
      for (const id of ids) {
        const l = store.get(id);
        if (l) store.set(id, { ...l, _syncStatus: status });
      }
    },
    async bulkUpsertSynced(logs) {
      for (const l of logs) store.set(l.id, l);
    },
  };

  return { adapter, store };
}

describe("activityLogRepositoryLogic", () => {
  let store: Map<string, Syncable<LocalActivityLog>>;
  let repo: ReturnType<typeof newActivityLogRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
    const mem = createInMemoryAdapter();
    store = mem.store;
    repo = newActivityLogRepository(mem.adapter);
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

      const result = await repo.createActivityLog(input);

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

      // storeに保存されていることを確認
      const stored = store.get("mock-uuid-1");
      expect(stored).toEqual(result);
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

      const result = await repo.createActivityLog(input);

      expect(result.activityKindId).toBeNull();
      expect(result.time).toBeNull();
    });
  });

  // ========== Read ==========
  describe("getActivityLogsByDate", () => {
    it("指定日付のログを返す", async () => {
      // storeに直接データをセット
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });
      store.set("log-2", {
        id: "log-2",
        activityId: "act-2",
        activityKindId: null,
        quantity: 2,
        memo: "",
        date: "2024-06-02",
        time: null,
        createdAt: "2024-06-02T00:00:00Z",
        updatedAt: "2024-06-02T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      const result = await repo.getActivityLogsByDate("2024-06-01");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("log-1");
    });

    it("deletedAtが設定されたログは返さない", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: "2024-06-01T12:00:00Z",
        _syncStatus: "synced",
      });

      const result = await repo.getActivityLogsByDate("2024-06-01");

      expect(result).toHaveLength(0);
    });
  });

  describe("getActivityLogsBetween", () => {
    it("指定期間のログを返す", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });
      store.set("log-2", {
        id: "log-2",
        activityId: "act-2",
        activityKindId: null,
        quantity: 2,
        memo: "",
        date: "2024-06-05",
        time: null,
        createdAt: "2024-06-05T00:00:00Z",
        updatedAt: "2024-06-05T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });
      store.set("log-3", {
        id: "log-3",
        activityId: "act-3",
        activityKindId: null,
        quantity: 3,
        memo: "",
        date: "2024-06-10",
        time: null,
        createdAt: "2024-06-10T00:00:00Z",
        updatedAt: "2024-06-10T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      const result = await repo.getActivityLogsBetween(
        "2024-06-01",
        "2024-06-05",
      );

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(["log-1", "log-2"]);
    });
  });

  // ========== Update ==========
  describe("updateActivityLog", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "元メモ",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      await repo.updateActivityLog("log-1", {
        quantity: 10,
        memo: "更新メモ",
      });

      const updated = store.get("log-1")!;
      expect(updated.quantity).toBe(10);
      expect(updated.memo).toBe("更新メモ");
      expect(updated.updatedAt).not.toBe("2024-06-01T00:00:00Z");
      expect(updated._syncStatus).toBe("pending");
      // 変更していないフィールドは保持される
      expect(updated.activityId).toBe("act-1");
      expect(updated.date).toBe("2024-06-01");
    });

    it("単一フィールドの更新", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      await repo.updateActivityLog("log-1", {
        date: "2024-07-01",
      });

      const updated = store.get("log-1")!;
      expect(updated.date).toBe("2024-07-01");
      expect(updated._syncStatus).toBe("pending");
      expect(updated.updatedAt).not.toBe("2024-06-01T00:00:00Z");
    });
  });

  // ========== Delete ==========
  describe("softDeleteActivityLog", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      await repo.softDeleteActivityLog("log-1");

      const deleted = store.get("log-1")!;
      expect(deleted.deletedAt).toEqual(expect.any(String));
      expect(deleted.updatedAt).not.toBe("2024-06-01T00:00:00Z");
      expect(deleted._syncStatus).toBe("pending");
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncActivityLogs", () => {
    it("_syncStatus=pendingのログのみ返す", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });
      store.set("log-2", {
        id: "log-2",
        activityId: "act-2",
        activityKindId: null,
        quantity: 2,
        memo: "",
        date: "2024-06-02",
        time: null,
        createdAt: "2024-06-02T00:00:00Z",
        updatedAt: "2024-06-02T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      const result = await repo.getPendingSyncActivityLogs();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("log-1");
    });
  });

  describe("markActivityLogsSynced", () => {
    it("指定IDのログをsynced状態にする", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });
      store.set("log-2", {
        id: "log-2",
        activityId: "act-2",
        activityKindId: null,
        quantity: 2,
        memo: "",
        date: "2024-06-02",
        time: null,
        createdAt: "2024-06-02T00:00:00Z",
        updatedAt: "2024-06-02T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      await repo.markActivityLogsSynced(["log-1", "log-2"]);

      expect(store.get("log-1")!._syncStatus).toBe("synced");
      expect(store.get("log-2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      await repo.markActivityLogsSynced([]);

      // pendingのまま変更されない
      expect(store.get("log-1")!._syncStatus).toBe("pending");
    });
  });

  describe("markActivityLogsFailed", () => {
    it("指定IDのログをfailed状態にする", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      await repo.markActivityLogsFailed(["log-1"]);

      expect(store.get("log-1")!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      await repo.markActivityLogsFailed([]);

      expect(store.get("log-1")!._syncStatus).toBe("pending");
    });
  });

  // ========== Server upsert ==========
  describe("upsertActivityLogsFromServer", () => {
    it("サーバーデータをsynced状態で保存する", async () => {
      const logs = [
        {
          id: "log-1",
          activityId: "act-1",
          activityKindId: null,
          quantity: 1,
          memo: "",
          date: "2024-06-01",
          time: null,
          createdAt: "2024-06-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "log-2",
          activityId: "act-2",
          activityKindId: "kind-1",
          quantity: 5,
          memo: "テスト",
          date: "2024-06-02",
          time: "10:00",
          createdAt: "2024-06-02T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityLogsFromServer(logs);

      expect(store.get("log-1")!._syncStatus).toBe("synced");
      expect(store.get("log-1")!.activityId).toBe("act-1");
      expect(store.get("log-2")!._syncStatus).toBe("synced");
      expect(store.get("log-2")!.activityId).toBe("act-2");
    });

    it("pendingレコードを上書きしない", async () => {
      // log-1はpendingでローカルに存在する
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 99,
        memo: "ローカル変更",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      const logs = [
        {
          id: "log-1",
          activityId: "act-1",
          activityKindId: null,
          quantity: 1,
          memo: "サーバー値",
          date: "2024-06-01",
          time: null,
          createdAt: "2024-06-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "log-2",
          activityId: "act-2",
          activityKindId: null,
          quantity: 2,
          memo: "",
          date: "2024-06-02",
          time: null,
          createdAt: "2024-06-02T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityLogsFromServer(logs);

      // log-1はpendingのまま、ローカル値が保持される
      const log1 = store.get("log-1")!;
      expect(log1._syncStatus).toBe("pending");
      expect(log1.quantity).toBe(99);
      expect(log1.memo).toBe("ローカル変更");

      // log-2は新規なのでsyncedで保存される
      const log2 = store.get("log-2")!;
      expect(log2._syncStatus).toBe("synced");
    });

    it("全レコードがpendingの場合スキップする", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });
      store.set("log-2", {
        id: "log-2",
        activityId: "act-2",
        activityKindId: null,
        quantity: 2,
        memo: "",
        date: "2024-06-02",
        time: null,
        createdAt: "2024-06-02T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      const logs = [
        {
          id: "log-1",
          activityId: "act-1",
          activityKindId: null,
          quantity: 100,
          memo: "サーバー",
          date: "2024-06-01",
          time: null,
          createdAt: "2024-06-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "log-2",
          activityId: "act-2",
          activityKindId: null,
          quantity: 200,
          memo: "サーバー",
          date: "2024-06-02",
          time: null,
          createdAt: "2024-06-02T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityLogsFromServer(logs);

      // 両方pendingのまま、サーバー値で上書きされていない
      expect(store.get("log-1")!._syncStatus).toBe("pending");
      expect(store.get("log-1")!.quantity).toBe(1);
      expect(store.get("log-2")!._syncStatus).toBe("pending");
      expect(store.get("log-2")!.quantity).toBe(2);
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 50,
        memo: "新しいローカル",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z", // ローカルの方が新しい
        deletedAt: null,
        _syncStatus: "synced",
      });

      const logs = [
        {
          id: "log-1",
          activityId: "act-1",
          activityKindId: null,
          quantity: 1,
          memo: "古いサーバー",
          date: "2024-06-01",
          time: null,
          createdAt: "2024-06-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z", // サーバーの方が古い
          deletedAt: null,
        },
        {
          id: "log-2",
          activityId: "act-2",
          activityKindId: null,
          quantity: 2,
          memo: "",
          date: "2024-06-02",
          time: null,
          createdAt: "2024-06-02T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityLogsFromServer(logs);

      // log-1はローカルの方が新しいので上書きされない
      const log1 = store.get("log-1")!;
      expect(log1.quantity).toBe(50);
      expect(log1.memo).toBe("新しいローカル");

      // log-2は新規なのでsyncedで保存される
      const log2 = store.get("log-2")!;
      expect(log2._syncStatus).toBe("synced");
      expect(log2.quantity).toBe(2);
    });

    it("空配列の場合何もしない", async () => {
      store.set("log-1", {
        id: "log-1",
        activityId: "act-1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2024-06-01",
        time: null,
        createdAt: "2024-06-01T00:00:00Z",
        updatedAt: "2024-06-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      await repo.upsertActivityLogsFromServer([]);

      // storeは変更されない
      expect(store.size).toBe(1);
      expect(store.get("log-1")!._syncStatus).toBe("synced");
    });
  });
});
