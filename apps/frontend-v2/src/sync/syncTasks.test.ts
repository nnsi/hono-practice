import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/taskRepository");
vi.mock("@packages/sync-engine/mappers/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { mapApiTask } from "@packages/sync-engine/mappers/apiMappers";

import { taskRepository } from "../db/taskRepository";
import { invalidateSync } from "./syncState";
import { syncTasks } from "./syncTasks";

const mockTaskRepo = vi.mocked(taskRepository);

describe("syncTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiTask).mockImplementation((t: any) => t);
  });

  it("skips when no pending tasks", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([]);

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).not.toHaveBeenCalled();
  });

  it("strips _syncStatus before sending", async () => {
    const pending = [
      {
        id: "t1",
        title: "Task 1",
        userId: "u1",
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending" as const,
      },
    ];
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["t1"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    const sentJson = mockPost.mock.calls[0][0].json;
    const sentTask = sentJson.tasks[0];
    expect(sentTask).not.toHaveProperty("_syncStatus");
    expect(sentTask.id).toBe("t1");
    expect(sentTask.title).toBe("Task 1");
  });

  it("marks synced, failed, and upserts serverWins", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ] as any);

    const serverWin = { id: "t2", title: "Server Task" };
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["t1"],
          skippedIds: ["t3"],
          serverWins: [serverWin],
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).toHaveBeenCalledWith(["t1"]);
    expect(mockTaskRepo.markTasksFailed).toHaveBeenCalledWith(["t3"]);
    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalledWith([
      serverWin,
    ]);
  });

  it("throws when API returns not ok (H5)", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await expect(syncTasks()).rejects.toThrow("syncTasks failed");

    expect(mockTaskRepo.markTasksSynced).not.toHaveBeenCalled();
  });

  it("sends tasks in chunks of 100", async () => {
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `t-${i}`,
      _syncStatus: "pending",
    })) as any;
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: [],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][0].json.tasks).toHaveLength(100);
    expect(mockPost.mock.calls[1][0].json.tasks).toHaveLength(50);
  });

  it("handles exactly 100 tasks in a single chunk", async () => {
    const pending = Array.from({ length: 100 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    })) as any;
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [] }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0].json.tasks).toHaveLength(100);
  });

  it("splits 101 tasks into 2 chunks (100 + 1)", async () => {
    const pending = Array.from({ length: 101 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    })) as any;
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [] }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][0].json.tasks).toHaveLength(100);
    expect(mockPost.mock.calls[1][0].json.tasks).toHaveLength(1);
  });

  it("throws on second chunk failure but marks first chunk as synced", async () => {
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    })) as any;
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending);

    const firstChunkIds = Array.from({ length: 100 }, (_, i) => `t-${i}`);
    const mockPost = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            syncedIds: firstChunkIds,
            skippedIds: [],
            serverWins: [],
          }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await expect(syncTasks()).rejects.toThrow("syncTasks failed");

    // 成功した第1チャンクはmark済み、第2チャンクは失敗でmarkされない
    expect(mockTaskRepo.markTasksSynced).toHaveBeenCalledTimes(1);
    expect(mockTaskRepo.markTasksSynced).toHaveBeenCalledWith(firstChunkIds);
    expect(mockTaskRepo.markTasksFailed).toHaveBeenCalledTimes(1);
    expect(mockTaskRepo.markTasksFailed).toHaveBeenCalledWith([]);
    expect(mockTaskRepo.upsertTasksFromServer).not.toHaveBeenCalled();
  });

  it("upserts serverWins items via mapApiTask", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t-0", title: "Task 0", _syncStatus: "pending" },
    ] as any);

    const serverWins = [
      { id: "sw-1", title: "Server Task 1" },
      { id: "sw-2", title: "Server Task 2" },
    ];
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["t-0"],
          skippedIds: [],
          serverWins,
        }),
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalledWith(serverWins);
    expect(mockTaskRepo.markTasksSynced).toHaveBeenCalledWith(["t-0"]);
  });

  it("processes serverWins per chunk", async () => {
    const pending = Array.from({ length: 120 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    })) as any;
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", title: "From Chunk 1" };
    const sw2 = { id: "sw-2", title: "From Chunk 2" };
    const mockPost = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            syncedIds: [],
            skippedIds: [],
            serverWins: [sw1],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            syncedIds: [],
            skippedIds: [],
            serverWins: [sw2],
          }),
      });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    // チャンクごとに個別にupsert
    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenCalledTimes(2);
    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenNthCalledWith(1, [
      sw1,
    ]);
    expect(mockTaskRepo.upsertTasksFromServer).toHaveBeenNthCalledWith(2, [
      sw2,
    ]);
  });

  it("skips DB writes when sync generation changes (H4)", async () => {
    mockTaskRepo.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockImplementation(async () => {
      invalidateSync();
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            syncedIds: ["t1"],
            skippedIds: [],
            serverWins: [{ id: "sw-1" }],
          }),
      };
    });
    mockApiClientObj.users = {
      v2: { tasks: { sync: { $post: mockPost } } },
    };

    await syncTasks();

    expect(mockTaskRepo.markTasksSynced).not.toHaveBeenCalled();
    expect(mockTaskRepo.upsertTasksFromServer).not.toHaveBeenCalled();
  });
});
