import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uuidState = vi.hoisted(() => ({ counter: 0 }));

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidState.counter}`),
}));

import type { TaskDbAdapter } from "../taskRepositoryLogic";
import { newTaskRepository } from "../taskRepositoryLogic";

function createInMemoryAdapter() {
  const store = new Map<string, Syncable<TaskRecord>>();
  let userId: string | undefined = "user-1";

  const adapter: TaskDbAdapter = {
    async getUserId() {
      if (!userId) throw new Error("Cannot create task: userId is not set");
      return userId;
    },
    async insert(task) {
      store.set(task.id, task);
    },
    async getAll(filter) {
      return [...store.values()].filter(filter);
    },
    async update(id, changes) {
      const existing = store.get(id);
      if (existing)
        store.set(id, { ...existing, ...changes } as Syncable<TaskRecord>);
    },
    async getByIds(ids) {
      return ids
        .map((id) => store.get(id))
        .filter((t): t is Syncable<TaskRecord> => t !== undefined);
    },
    async updateSyncStatus(ids, status) {
      for (const id of ids) {
        const t = store.get(id);
        if (t) store.set(id, { ...t, _syncStatus: status });
      }
    },
    async bulkUpsertSynced(tasks) {
      for (const t of tasks) store.set(t.id, t);
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

function createTask(
  overrides: Partial<Syncable<TaskRecord>> = {},
): Syncable<TaskRecord> {
  return {
    id: "task-default",
    userId: "user-1",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "デフォルトタスク",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

describe("taskRepositoryLogic", () => {
  let adapter: ReturnType<typeof createInMemoryAdapter>["adapter"];
  let store: ReturnType<typeof createInMemoryAdapter>["store"];
  let setUserId: ReturnType<typeof createInMemoryAdapter>["setUserId"];
  let repo: ReturnType<typeof newTaskRepository>;

  beforeEach(() => {
    const env = createInMemoryAdapter();
    adapter = env.adapter;
    store = env.store;
    setUserId = env.setUserId;
    repo = newTaskRepository(adapter);
    uuidState.counter = 0;
  });

  // ========== Create ==========
  describe("createTask", () => {
    it("デフォルト値付きでTaskを作成する", async () => {
      const result = await repo.createTask({
        title: "テストタスク",
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.userId).toBe("user-1");
      expect(result.title).toBe("テストタスク");
      expect(result.activityId).toBeNull();
      expect(result.startDate).toBeNull();
      expect(result.dueDate).toBeNull();
      expect(result.doneDate).toBeNull();
      expect(result.memo).toBe("");
      expect(result.archivedAt).toBeNull();
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");

      // ストアにも保存されている
      const stored = store.get("mock-uuid-1");
      expect(stored).toEqual(result);
    });

    it("全オプションを指定できる", async () => {
      const result = await repo.createTask({
        title: "完全指定タスク",
        startDate: "2024-06-01",
        dueDate: "2024-06-30",
        memo: "メモ内容",
      });

      expect(result.title).toBe("完全指定タスク");
      expect(result.startDate).toBe("2024-06-01");
      expect(result.dueDate).toBe("2024-06-30");
      expect(result.memo).toBe("メモ内容");
    });

    it("authStateがない場合エラーを投げる", async () => {
      setUserId(undefined);

      await expect(
        repo.createTask({
          title: "認証なしタスク",
        }),
      ).rejects.toThrow("Cannot create task: userId is not set");
    });

    it("startDateにnullを明示的に渡した場合", async () => {
      const result = await repo.createTask({
        title: "テスト",
        startDate: null,
        dueDate: null,
      });

      expect(result.startDate).toBeNull();
      expect(result.dueDate).toBeNull();
    });
  });

  // ========== Read ==========
  describe("getAllActiveTasks", () => {
    it("deletedAt/archivedAtがないTaskのみ返す", async () => {
      store.set(
        "t1",
        createTask({
          id: "t1",
          title: "Active",
          deletedAt: null,
          archivedAt: null,
        }),
      );
      store.set(
        "t2",
        createTask({
          id: "t2",
          title: "Deleted",
          deletedAt: "2024-01-01T00:00:00Z",
        }),
      );
      store.set(
        "t3",
        createTask({
          id: "t3",
          title: "Archived",
          archivedAt: "2024-01-01T00:00:00Z",
        }),
      );
      store.set(
        "t4",
        createTask({
          id: "t4",
          title: "Both",
          deletedAt: "2024-01-01T00:00:00Z",
          archivedAt: "2024-01-01T00:00:00Z",
        }),
      );

      const result = await repo.getAllActiveTasks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
    });
  });

  describe("getArchivedTasks", () => {
    it("deletedAtなしでarchivedAtありのTaskのみ返す", async () => {
      store.set(
        "t1",
        createTask({
          id: "t1",
          title: "Active",
          deletedAt: null,
          archivedAt: null,
        }),
      );
      store.set(
        "t2",
        createTask({
          id: "t2",
          title: "Archived",
          deletedAt: null,
          archivedAt: "2024-06-01T00:00:00Z",
        }),
      );
      store.set(
        "t3",
        createTask({
          id: "t3",
          title: "Deleted+Archived",
          deletedAt: "2024-01-01T00:00:00Z",
          archivedAt: "2024-01-01T00:00:00Z",
        }),
      );

      const result = await repo.getArchivedTasks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t2");
    });
  });

  describe("getTasksByDate", () => {
    it("isTaskVisibleOnDate述語に基づいてTaskを返す", async () => {
      // startDateなし → 表示される
      store.set(
        "t1",
        createTask({ id: "t1", title: "No dates", startDate: null }),
      );
      // startDateが指定日以前 → 表示される
      store.set(
        "t2",
        createTask({ id: "t2", title: "Before", startDate: "2024-06-10" }),
      );
      // startDateが指定日と同日 → 表示される
      store.set(
        "t3",
        createTask({ id: "t3", title: "Same day", startDate: "2024-06-15" }),
      );
      // startDateが指定日より未来 → 表示されない
      store.set(
        "t4",
        createTask({ id: "t4", title: "Future", startDate: "2024-06-20" }),
      );
      // deletedAtあり → 表示されない
      store.set(
        "t5",
        createTask({
          id: "t5",
          title: "Deleted",
          startDate: null,
          deletedAt: "2024-01-01T00:00:00Z",
        }),
      );
      // archivedAtあり → 表示されない
      store.set(
        "t6",
        createTask({
          id: "t6",
          title: "Archived",
          startDate: null,
          archivedAt: "2024-01-01T00:00:00Z",
        }),
      );
      // dueDate < date → 表示されない
      store.set(
        "t7",
        createTask({
          id: "t7",
          title: "Past due",
          startDate: null,
          dueDate: "2024-06-10",
        }),
      );
      // doneDate === date → 表示される
      store.set(
        "t8",
        createTask({
          id: "t8",
          title: "Done today",
          startDate: null,
          doneDate: "2024-06-15",
        }),
      );
      // doneDate !== date → 表示されない
      store.set(
        "t9",
        createTask({
          id: "t9",
          title: "Done other day",
          startDate: null,
          doneDate: "2024-06-10",
        }),
      );

      const result = await repo.getTasksByDate("2024-06-15");

      const ids = result.map((t) => t.id).sort();
      expect(ids).toEqual(["t1", "t2", "t3", "t8"]);
    });
  });

  // ========== Update ==========
  describe("updateTask", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      store.set(
        "task-1",
        createTask({
          id: "task-1",
          title: "元タイトル",
          _syncStatus: "synced",
        }),
      );

      await repo.updateTask("task-1", {
        title: "更新タイトル",
        doneDate: "2024-06-15",
      });

      const updated = store.get("task-1")!;
      expect(updated.title).toBe("更新タイトル");
      expect(updated.doneDate).toBe("2024-06-15");
      expect(updated.updatedAt).toEqual(expect.any(String));
      expect(updated._syncStatus).toBe("pending");
    });

    it("単一フィールドの更新", async () => {
      store.set(
        "task-1",
        createTask({
          id: "task-1",
          title: "元タイトル",
          memo: "古いメモ",
          _syncStatus: "synced",
        }),
      );

      await repo.updateTask("task-1", { memo: "新しいメモ" });

      const updated = store.get("task-1")!;
      expect(updated.memo).toBe("新しいメモ");
      expect(updated.title).toBe("元タイトル"); // 他のフィールドは変わらない
      expect(updated._syncStatus).toBe("pending");
    });
  });

  // ========== Archive ==========
  describe("archiveTask", () => {
    it("archivedAtを設定してpending状態にする", async () => {
      store.set(
        "task-1",
        createTask({
          id: "task-1",
          archivedAt: null,
          _syncStatus: "synced",
        }),
      );

      await repo.archiveTask("task-1");

      const updated = store.get("task-1")!;
      expect(updated.archivedAt).toEqual(expect.any(String));
      expect(updated.updatedAt).toEqual(expect.any(String));
      expect(updated._syncStatus).toBe("pending");
    });
  });

  // ========== Delete ==========
  describe("softDeleteTask", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      store.set(
        "task-1",
        createTask({
          id: "task-1",
          deletedAt: null,
          _syncStatus: "synced",
        }),
      );

      await repo.softDeleteTask("task-1");

      const updated = store.get("task-1")!;
      expect(updated.deletedAt).toEqual(expect.any(String));
      expect(updated.updatedAt).toEqual(expect.any(String));
      expect(updated._syncStatus).toBe("pending");
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncTasks", () => {
    it("_syncStatus=pendingのTasksを返す", async () => {
      store.set("t1", createTask({ id: "t1", _syncStatus: "pending" }));
      store.set("t2", createTask({ id: "t2", _syncStatus: "synced" }));
      store.set("t3", createTask({ id: "t3", _syncStatus: "failed" }));

      const result = await repo.getPendingSyncTasks();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
    });
  });

  describe("markTasksSynced", () => {
    it("指定IDのTasksをsynced状態にする", async () => {
      store.set("t1", createTask({ id: "t1", _syncStatus: "pending" }));
      store.set("t2", createTask({ id: "t2", _syncStatus: "pending" }));

      await repo.markTasksSynced(["t1", "t2"]);

      expect(store.get("t1")!._syncStatus).toBe("synced");
      expect(store.get("t2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      store.set("t1", createTask({ id: "t1", _syncStatus: "pending" }));

      await repo.markTasksSynced([]);

      // pendingのまま変わらない
      expect(store.get("t1")!._syncStatus).toBe("pending");
    });
  });

  describe("markTasksFailed", () => {
    it("指定IDのTasksをfailed状態にする", async () => {
      store.set("t1", createTask({ id: "t1", _syncStatus: "pending" }));

      await repo.markTasksFailed(["t1"]);

      expect(store.get("t1")!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      store.set("t1", createTask({ id: "t1", _syncStatus: "pending" }));

      await repo.markTasksFailed([]);

      // pendingのまま変わらない
      expect(store.get("t1")!._syncStatus).toBe("pending");
    });
  });

  // ========== Server upsert ==========
  describe("upsertTasksFromServer", () => {
    it("サーバーデータをsynced状態でupsertする", async () => {
      const tasks: TaskRecord[] = [
        createTask({
          id: "t1",
          title: "Task 1",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
        createTask({
          id: "t2",
          title: "Task 2",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      ];

      await repo.upsertTasksFromServer(tasks);

      expect(store.get("t1")!._syncStatus).toBe("synced");
      expect(store.get("t1")!.title).toBe("Task 1");
      expect(store.get("t2")!._syncStatus).toBe("synced");
      expect(store.get("t2")!.title).toBe("Task 2");
    });

    it("pendingレコードを上書きしない", async () => {
      // ローカルにpendingのt1がある
      store.set(
        "t1",
        createTask({
          id: "t1",
          title: "Local pending",
          _syncStatus: "pending",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      );

      const tasks: TaskRecord[] = [
        createTask({
          id: "t1",
          title: "Server Task 1",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
        createTask({
          id: "t2",
          title: "Server Task 2",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      ];

      await repo.upsertTasksFromServer(tasks);

      // t1はpendingなので上書きされない
      expect(store.get("t1")!.title).toBe("Local pending");
      expect(store.get("t1")!._syncStatus).toBe("pending");
      // t2は新規なのでupsertされる
      expect(store.get("t2")!.title).toBe("Server Task 2");
      expect(store.get("t2")!._syncStatus).toBe("synced");
    });

    it("全レコードがpendingの場合bulkUpsertをスキップする", async () => {
      store.set(
        "t1",
        createTask({
          id: "t1",
          _syncStatus: "pending",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      );
      store.set(
        "t2",
        createTask({
          id: "t2",
          _syncStatus: "pending",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      );

      const bulkUpsertSpy = vi.spyOn(adapter, "bulkUpsertSynced");

      const tasks: TaskRecord[] = [
        createTask({
          id: "t1",
          title: "Server 1",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
        createTask({
          id: "t2",
          title: "Server 2",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      ];

      await repo.upsertTasksFromServer(tasks);

      expect(bulkUpsertSpy).not.toHaveBeenCalled();
      // ローカルデータは変わらない
      expect(store.get("t1")!._syncStatus).toBe("pending");
      expect(store.get("t2")!._syncStatus).toBe("pending");
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      store.set(
        "t1",
        createTask({
          id: "t1",
          title: "Newer local",
          _syncStatus: "synced",
          updatedAt: "2026-03-05T00:00:00Z",
        }),
      );

      const tasks: TaskRecord[] = [
        createTask({
          id: "t1",
          title: "Older server",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
        createTask({
          id: "t2",
          title: "New task",
          updatedAt: "2026-03-01T00:00:00Z",
        }),
      ];

      await repo.upsertTasksFromServer(tasks);

      // t1はローカルの方が新しいので上書きされない
      expect(store.get("t1")!.title).toBe("Newer local");
      // t2は新規なのでupsertされる
      expect(store.get("t2")!.title).toBe("New task");
      expect(store.get("t2")!._syncStatus).toBe("synced");
    });

    it("空配列の場合何もしない", async () => {
      const bulkUpsertSpy = vi.spyOn(adapter, "bulkUpsertSynced");
      const getByIdsSpy = vi.spyOn(adapter, "getByIds");

      await repo.upsertTasksFromServer([]);

      expect(getByIdsSpy).not.toHaveBeenCalled();
      expect(bulkUpsertSpy).not.toHaveBeenCalled();
    });
  });
});
