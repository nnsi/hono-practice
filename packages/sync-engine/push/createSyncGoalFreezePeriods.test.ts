import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncGoalFreezePeriods } from "./createSyncGoalFreezePeriods";

function createMockDeps() {
  return {
    getPendingSyncFreezePeriods: vi.fn().mockResolvedValue([]),
    postChunk: vi.fn().mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    }),
    markFreezePeriodsSynced: vi.fn().mockResolvedValue(undefined),
    markFreezePeriodsFailed: vi.fn().mockResolvedValue(undefined),
    upsertFreezePeriodsFromServer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createSyncGoalFreezePeriods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no pending freeze periods", async () => {
    const deps = createMockDeps();
    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);

    await syncFreezePeriods();

    expect(deps.markFreezePeriodsSynced).not.toHaveBeenCalled();
    expect(deps.postChunk).not.toHaveBeenCalled();
  });

  it("strips _syncStatus before sending", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncFreezePeriods.mockResolvedValue([
      {
        id: "fp1",
        goalId: "g1",
        userId: "u1",
        startDate: "2026-01-01",
        endDate: "2026-01-07",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["fp1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await syncFreezePeriods();

    const sentChunk = deps.postChunk.mock.calls[0][0];
    const sentFp = sentChunk[0];
    expect(sentFp).not.toHaveProperty("_syncStatus");
    expect(sentFp.id).toBe("fp1");
    expect(sentFp.goalId).toBe("g1");
  });

  it("marks synced and failed ids", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncFreezePeriods.mockResolvedValue([
      { id: "fp1", _syncStatus: "pending" },
    ]);

    const serverWin = {
      id: "fp2",
      goal_id: "g1",
      user_id: "u1",
      start_date: "2026-01-01",
      end_date: "2026-01-07",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    };
    deps.postChunk.mockResolvedValue({
      syncedIds: ["fp1"],
      skippedIds: ["fp3"],
      serverWins: [serverWin],
    });

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await syncFreezePeriods();

    expect(deps.markFreezePeriodsSynced).toHaveBeenCalledWith(["fp1"]);
    expect(deps.markFreezePeriodsFailed).toHaveBeenCalledWith(["fp3"]);
    expect(deps.upsertFreezePeriodsFromServer).toHaveBeenCalledTimes(1);
  });

  it("throws when postChunk throws", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncFreezePeriods.mockResolvedValue([
      { id: "fp1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockRejectedValue(
      new Error("syncFreezePeriods failed: 500"),
    );

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await expect(syncFreezePeriods()).rejects.toThrow(
      "syncFreezePeriods failed",
    );

    expect(deps.markFreezePeriodsSynced).not.toHaveBeenCalled();
  });

  it("sends freeze periods in chunks of 100", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `fp-${i}`,
      _syncStatus: "pending",
    }));
    deps.getPendingSyncFreezePeriods.mockResolvedValue(pending);

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await syncFreezePeriods();

    expect(deps.postChunk).toHaveBeenCalledTimes(2);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
    expect(deps.postChunk.mock.calls[1][0]).toHaveLength(50);
  });

  it("processes serverWins per chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 120 }, (_, i) => ({
      id: `fp-${i}`,
      startDate: "2026-01-01",
      _syncStatus: "pending",
    }));
    deps.getPendingSyncFreezePeriods.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", startDate: "2026-01-01" };
    const sw2 = { id: "sw-2", startDate: "2026-02-01" };
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

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await syncFreezePeriods();

    expect(deps.upsertFreezePeriodsFromServer).toHaveBeenCalledTimes(2);
  });

  it("throws on second chunk failure but marks first chunk as synced", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `fp-${i}`,
      startDate: "2026-01-01",
      _syncStatus: "pending",
    }));
    deps.getPendingSyncFreezePeriods.mockResolvedValue(pending);

    const firstChunkIds = Array.from({ length: 100 }, (_, i) => `fp-${i}`);
    deps.postChunk
      .mockResolvedValueOnce({
        syncedIds: firstChunkIds,
        skippedIds: [],
        serverWins: [],
      })
      .mockRejectedValueOnce(new Error("syncFreezePeriods failed: 500"));

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await expect(syncFreezePeriods()).rejects.toThrow(
      "syncFreezePeriods failed",
    );

    expect(deps.markFreezePeriodsSynced).toHaveBeenCalledTimes(1);
    expect(deps.markFreezePeriodsSynced).toHaveBeenCalledWith(firstChunkIds);
  });

  it("skips DB writes when sync generation changes", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncFreezePeriods.mockResolvedValue([
      { id: "fp1", _syncStatus: "pending" },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return {
        syncedIds: ["fp1"],
        skippedIds: [],
        serverWins: [{ id: "sw-1" }],
      };
    });

    const syncFreezePeriods = createSyncGoalFreezePeriods(deps);
    await syncFreezePeriods();

    expect(deps.markFreezePeriodsSynced).not.toHaveBeenCalled();
    expect(deps.upsertFreezePeriodsFromServer).not.toHaveBeenCalled();
  });
});
