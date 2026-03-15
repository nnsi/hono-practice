import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncActivityLogs } from "./createSyncActivityLogs";

function createMockDeps() {
  return {
    getPendingSyncActivityLogs: vi.fn().mockResolvedValue([]),
    postChunk: vi.fn().mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    }),
    markActivityLogsSynced: vi.fn().mockResolvedValue(undefined),
    markActivityLogsFailed: vi.fn().mockResolvedValue(undefined),
    upsertActivityLogsFromServer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createSyncActivityLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no pending logs", async () => {
    const deps = createMockDeps();
    const syncActivityLogs = createSyncActivityLogs(deps);

    await syncActivityLogs();

    expect(deps.markActivityLogsSynced).not.toHaveBeenCalled();
  });

  it("sends logs without _syncStatus field", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      {
        id: "l1",
        activityId: "a1",
        quantity: 5,
        date: "2025-01-01",
        _syncStatus: "pending",
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["l1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    const sentChunk = deps.postChunk.mock.calls[0][0];
    expect(sentChunk[0]).not.toHaveProperty("_syncStatus");
    expect(sentChunk[0]).toEqual({
      id: "l1",
      activityId: "a1",
      quantity: 5,
      date: "2025-01-01",
    });
  });

  it("marks synced on success", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["l1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.markActivityLogsSynced).toHaveBeenCalledWith(["l1"]);
  });

  it("upserts serverWins via mapApiActivityLog", async () => {
    const deps = createMockDeps();
    const serverWin = {
      id: "l2",
      activityId: "a1",
      quantity: 10,
      activity_kind_id: null,
      memo: "",
      date: "2025-01-01",
      time: null,
      task_id: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      deleted_at: null,
    };
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [serverWin],
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.upsertActivityLogsFromServer).toHaveBeenCalledTimes(1);
    // mapApiActivityLog should have been applied to the server wins
    const upserted = deps.upsertActivityLogsFromServer.mock.calls[0][0];
    expect(upserted[0].id).toBe("l2");
  });

  it("marks failed for skippedIds", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
      { id: "l2", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["l1"],
      skippedIds: ["l2"],
      serverWins: [],
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.markActivityLogsSynced).toHaveBeenCalledWith(["l1"]);
    expect(deps.markActivityLogsFailed).toHaveBeenCalledWith(["l2"]);
  });

  it("throws when postChunk throws", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockRejectedValue(new Error("syncActivityLogs failed: 500"));

    const syncActivityLogs = createSyncActivityLogs(deps);
    await expect(syncActivityLogs()).rejects.toThrow("syncActivityLogs failed");

    expect(deps.markActivityLogsSynced).not.toHaveBeenCalled();
    expect(deps.markActivityLogsFailed).not.toHaveBeenCalled();
  });

  it("sends logs in chunks of 100", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `l-${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncActivityLogs.mockResolvedValue(pending);
    deps.postChunk.mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.postChunk).toHaveBeenCalledTimes(2);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
    expect(deps.postChunk.mock.calls[1][0]).toHaveLength(50);
  });

  it("processes results per chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 120 }, (_, i) => ({
      id: `l-${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncActivityLogs.mockResolvedValue(pending);

    const firstChunkSyncedIds = Array.from({ length: 100 }, (_, i) => `l-${i}`);
    const secondChunkSyncedIds = Array.from(
      { length: 10 },
      (_, i) => `l-${100 + i}`,
    );
    const secondChunkSkippedIds = Array.from(
      { length: 10 },
      (_, i) => `l-${110 + i}`,
    );

    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: firstChunkSyncedIds,
        skippedIds: [],
        serverWins: [],
      })
      .mockResolvedValueOnce({
        syncedIds: secondChunkSyncedIds,
        skippedIds: secondChunkSkippedIds,
        serverWins: [],
      });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.markActivityLogsSynced).toHaveBeenCalledTimes(2);
    expect(deps.markActivityLogsSynced).toHaveBeenNthCalledWith(
      1,
      firstChunkSyncedIds,
    );
    expect(deps.markActivityLogsSynced).toHaveBeenNthCalledWith(
      2,
      secondChunkSyncedIds,
    );
    expect(deps.markActivityLogsFailed).toHaveBeenCalledTimes(2);
    expect(deps.markActivityLogsFailed).toHaveBeenNthCalledWith(1, []);
    expect(deps.markActivityLogsFailed).toHaveBeenNthCalledWith(
      2,
      secondChunkSkippedIds,
    );
  });

  it("skips DB writes when sync generation changes (H4)", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return {
        syncedIds: ["l1"],
        skippedIds: [],
        serverWins: [],
      };
    });

    const syncActivityLogs = createSyncActivityLogs(deps);
    await syncActivityLogs();

    expect(deps.markActivityLogsSynced).not.toHaveBeenCalled();
    expect(deps.markActivityLogsFailed).not.toHaveBeenCalled();
  });
});
