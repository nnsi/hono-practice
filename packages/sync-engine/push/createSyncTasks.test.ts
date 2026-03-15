import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncTasks } from "./createSyncTasks";

function createMockDeps() {
  return {
    getPendingSyncTasks: vi.fn().mockResolvedValue([]),
    postChunk: vi.fn().mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    }),
    markTasksSynced: vi.fn().mockResolvedValue(undefined),
    markTasksFailed: vi.fn().mockResolvedValue(undefined),
    upsertTasksFromServer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createSyncTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no pending tasks", async () => {
    const deps = createMockDeps();
    const syncTasks = createSyncTasks(deps);

    await syncTasks();

    expect(deps.markTasksSynced).not.toHaveBeenCalled();
  });

  it("strips _syncStatus before sending", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncTasks.mockResolvedValue([
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
        _syncStatus: "pending",
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["t1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncTasks = createSyncTasks(deps);
    await syncTasks();

    const sentChunk = deps.postChunk.mock.calls[0][0];
    const sentTask = sentChunk[0];
    expect(sentTask).not.toHaveProperty("_syncStatus");
    expect(sentTask.id).toBe("t1");
    expect(sentTask.title).toBe("Task 1");
  });

  it("marks synced, failed, and upserts serverWins", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ]);

    const serverWin = {
      id: "t2",
      title: "Server Task",
      user_id: "u1",
      activity_id: null,
      activity_kind_id: null,
      quantity: null,
      start_date: null,
      due_date: null,
      done_date: null,
      memo: "",
      archived_at: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      deleted_at: null,
    };
    deps.postChunk.mockResolvedValue({
      syncedIds: ["t1"],
      skippedIds: ["t3"],
      serverWins: [serverWin],
    });

    const syncTasks = createSyncTasks(deps);
    await syncTasks();

    expect(deps.markTasksSynced).toHaveBeenCalledWith(["t1"]);
    expect(deps.markTasksFailed).toHaveBeenCalledWith(["t3"]);
    expect(deps.upsertTasksFromServer).toHaveBeenCalledTimes(1);
  });

  it("throws when postChunk throws", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockRejectedValue(new Error("syncTasks failed: 500"));

    const syncTasks = createSyncTasks(deps);
    await expect(syncTasks()).rejects.toThrow("syncTasks failed");

    expect(deps.markTasksSynced).not.toHaveBeenCalled();
  });

  it("sends tasks in chunks of 100", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `t-${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncTasks.mockResolvedValue(pending);

    const syncTasks = createSyncTasks(deps);
    await syncTasks();

    expect(deps.postChunk).toHaveBeenCalledTimes(2);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
    expect(deps.postChunk.mock.calls[1][0]).toHaveLength(50);
  });

  it("processes serverWins per chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 120 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncTasks.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", title: "From Chunk 1" };
    const sw2 = { id: "sw-2", title: "From Chunk 2" };
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: [],
        skippedIds: [],
        serverWins: [sw1],
      })
      .mockResolvedValueOnce({
        syncedIds: [],
        skippedIds: [],
        serverWins: [sw2],
      });

    const syncTasks = createSyncTasks(deps);
    await syncTasks();

    expect(deps.upsertTasksFromServer).toHaveBeenCalledTimes(2);
  });

  it("throws on second chunk failure but marks first chunk as synced", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncTasks.mockResolvedValue(pending);

    const firstChunkIds = Array.from({ length: 100 }, (_, i) => `t-${i}`);
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: firstChunkIds,
        skippedIds: [],
        serverWins: [],
      })
      .mockRejectedValueOnce(new Error("syncTasks failed: 500"));

    const syncTasks = createSyncTasks(deps);
    await expect(syncTasks()).rejects.toThrow("syncTasks failed");

    expect(deps.markTasksSynced).toHaveBeenCalledTimes(1);
    expect(deps.markTasksSynced).toHaveBeenCalledWith(firstChunkIds);
  });

  it("skips DB writes when sync generation changes (H4)", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return {
        syncedIds: ["t1"],
        skippedIds: [],
        serverWins: [{ id: "sw-1" }],
      };
    });

    const syncTasks = createSyncTasks(deps);
    await syncTasks();

    expect(deps.markTasksSynced).not.toHaveBeenCalled();
    expect(deps.upsertTasksFromServer).not.toHaveBeenCalled();
  });
});
