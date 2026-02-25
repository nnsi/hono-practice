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
      tasks: createMockTable(),
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

import { taskRepository } from "./taskRepository";

describe("taskRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
    mockDb.authState.get.mockResolvedValue({ userId: "user-1" });
  });

  // ========== Create ==========
  describe("createTask", () => {
    it("デフォルト値付きでTaskを作成する", async () => {
      const result = await taskRepository.createTask({
        title: "テストタスク",
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.userId).toBe("user-1");
      expect(result.title).toBe("テストタスク");
      expect(result.startDate).toBeNull();
      expect(result.dueDate).toBeNull();
      expect(result.doneDate).toBeNull();
      expect(result.memo).toBe("");
      expect(result.archivedAt).toBeNull();
      expect(result.createdAt).toEqual(expect.any(String));
      expect(result.updatedAt).toEqual(expect.any(String));
      expect(result.deletedAt).toBeNull();
      expect(result._syncStatus).toBe("pending");
      expect(mockDb.tasks.add).toHaveBeenCalledWith(result);
    });

    it("全オプションを指定できる", async () => {
      const result = await taskRepository.createTask({
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

    it("authStateがない場合userIdは空文字になる", async () => {
      mockDb.authState.get.mockResolvedValue(undefined);

      const result = await taskRepository.createTask({
        title: "認証なしタスク",
      });

      expect(result.userId).toBe("");
    });

    it("startDateにnullを明示的に渡した場合", async () => {
      const result = await taskRepository.createTask({
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
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "t1", title: "Active Task" }]);
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.tasks.filter.mockImplementation(mockFilter);

      const result = await taskRepository.getAllActiveTasks();

      expect(result).toEqual([{ id: "t1", title: "Active Task" }]);
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null, archivedAt: null })).toBe(true);
      expect(filterFn({ deletedAt: "2024-01-01", archivedAt: null })).toBe(
        false,
      );
      expect(filterFn({ deletedAt: null, archivedAt: "2024-01-01" })).toBe(
        false,
      );
      expect(
        filterFn({ deletedAt: "2024-01-01", archivedAt: "2024-01-01" }),
      ).toBe(false);
    });
  });

  describe("getArchivedTasks", () => {
    it("deletedAtなしでarchivedAtありのTaskのみ返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "t1", archivedAt: "2024-06-01" }]);
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.tasks.filter.mockImplementation(mockFilter);

      const result = await taskRepository.getArchivedTasks();

      expect(result).toEqual([{ id: "t1", archivedAt: "2024-06-01" }]);
      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ deletedAt: null, archivedAt: "2024-01-01" })).toBe(
        true,
      );
      expect(filterFn({ deletedAt: null, archivedAt: null })).toBe(false);
      expect(
        filterFn({ deletedAt: "2024-01-01", archivedAt: "2024-01-01" }),
      ).toBe(false);
    });
  });

  describe("getTasksByDate", () => {
    it("deletedAt/archivedAtなし、startDate条件を満たすTaskを返す", async () => {
      const mockToArray = vi.fn().mockResolvedValue([{ id: "t1" }]);
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.tasks.filter.mockImplementation(mockFilter);

      const result = await taskRepository.getTasksByDate("2024-06-15");

      expect(result).toEqual([{ id: "t1" }]);

      const filterFn = mockFilter.mock.calls[0][0];
      // deletedAtなし、archivedAtなし、startDateなし
      expect(
        filterFn({ deletedAt: null, archivedAt: null, startDate: null }),
      ).toBe(true);
      // startDateが指定日以前
      expect(
        filterFn({
          deletedAt: null,
          archivedAt: null,
          startDate: "2024-06-10",
        }),
      ).toBe(true);
      // startDateが指定日と同日
      expect(
        filterFn({
          deletedAt: null,
          archivedAt: null,
          startDate: "2024-06-15",
        }),
      ).toBe(true);
      // startDateが指定日より未来
      expect(
        filterFn({
          deletedAt: null,
          archivedAt: null,
          startDate: "2024-06-20",
        }),
      ).toBe(false);
      // deletedAtあり
      expect(
        filterFn({
          deletedAt: "2024-01-01",
          archivedAt: null,
          startDate: null,
        }),
      ).toBe(false);
      // archivedAtあり
      expect(
        filterFn({
          deletedAt: null,
          archivedAt: "2024-01-01",
          startDate: null,
        }),
      ).toBe(false);
    });
  });

  // ========== Update ==========
  describe("updateTask", () => {
    it("部分更新にupdatedAtとpending statusを付与する", async () => {
      await taskRepository.updateTask("task-1", {
        title: "更新タイトル",
        doneDate: "2024-06-15",
      });

      expect(mockDb.tasks.update).toHaveBeenCalledWith("task-1", {
        title: "更新タイトル",
        doneDate: "2024-06-15",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });

    it("単一フィールドの更新", async () => {
      await taskRepository.updateTask("task-1", { memo: "新しいメモ" });

      expect(mockDb.tasks.update).toHaveBeenCalledWith("task-1", {
        memo: "新しいメモ",
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Archive ==========
  describe("archiveTask", () => {
    it("archivedAtを設定してpending状態にする", async () => {
      await taskRepository.archiveTask("task-1");

      expect(mockDb.tasks.update).toHaveBeenCalledWith("task-1", {
        archivedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Delete ==========
  describe("softDeleteTask", () => {
    it("deletedAtを設定してpending状態にする", async () => {
      await taskRepository.softDeleteTask("task-1");

      expect(mockDb.tasks.update).toHaveBeenCalledWith("task-1", {
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
        _syncStatus: "pending",
      });
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncTasks", () => {
    it("_syncStatus=pendingのTasksを返す", async () => {
      const mockToArray = vi
        .fn()
        .mockResolvedValue([{ id: "t1", _syncStatus: "pending" }]);
      const mockEquals = vi.fn().mockReturnValue({ toArray: mockToArray });
      mockDb.tasks.where.mockReturnValue({ equals: mockEquals });

      const result = await taskRepository.getPendingSyncTasks();

      expect(mockDb.tasks.where).toHaveBeenCalledWith("_syncStatus");
      expect(mockEquals).toHaveBeenCalledWith("pending");
      expect(result).toEqual([{ id: "t1", _syncStatus: "pending" }]);
    });
  });

  describe("markTasksSynced", () => {
    it("指定IDのTasksをsynced状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.tasks.where.mockReturnValue({ anyOf: mockAnyOf });

      await taskRepository.markTasksSynced(["t1", "t2"]);

      expect(mockDb.tasks.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["t1", "t2"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "synced" });
    });

    it("空配列の場合は何もしない", async () => {
      await taskRepository.markTasksSynced([]);
      expect(mockDb.tasks.where).not.toHaveBeenCalled();
    });
  });

  describe("markTasksFailed", () => {
    it("指定IDのTasksをfailed状態にする", async () => {
      const mockModify = vi.fn().mockResolvedValue(undefined);
      const mockAnyOf = vi.fn().mockReturnValue({ modify: mockModify });
      mockDb.tasks.where.mockReturnValue({ anyOf: mockAnyOf });

      await taskRepository.markTasksFailed(["t1"]);

      expect(mockDb.tasks.where).toHaveBeenCalledWith("id");
      expect(mockAnyOf).toHaveBeenCalledWith(["t1"]);
      expect(mockModify).toHaveBeenCalledWith({ _syncStatus: "failed" });
    });

    it("空配列の場合は何もしない", async () => {
      await taskRepository.markTasksFailed([]);
      expect(mockDb.tasks.where).not.toHaveBeenCalled();
    });
  });

  // ========== Server upsert ==========
  describe("upsertTasksFromServer", () => {
    it("サーバーデータをsynced状態でbulkPutする", async () => {
      const tasks = [
        { id: "t1", title: "Task 1" },
        { id: "t2", title: "Task 2" },
      ] as any[];

      await taskRepository.upsertTasksFromServer(tasks);

      expect(mockDb.tasks.bulkPut).toHaveBeenCalledWith([
        { id: "t1", title: "Task 1", _syncStatus: "synced" },
        { id: "t2", title: "Task 2", _syncStatus: "synced" },
      ]);
    });
  });
});
