import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSync } from "../core/syncState";
import { createSyncGoals } from "./createSyncGoals";

function createMockDeps() {
  return {
    getPendingSyncGoals: vi.fn().mockResolvedValue([]),
    postChunk: vi.fn().mockResolvedValue({
      syncedIds: [],
      skippedIds: [],
      serverWins: [],
    }),
    markGoalsSynced: vi.fn().mockResolvedValue(undefined),
    markGoalsFailed: vi.fn().mockResolvedValue(undefined),
    upsertGoalsFromServer: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createSyncGoals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when no pending goals", async () => {
    const deps = createMockDeps();
    const syncGoals = createSyncGoals(deps);

    await syncGoals();

    expect(deps.markGoalsSynced).not.toHaveBeenCalled();
  });

  it("strips _syncStatus AND computed fields before sending", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2025-01-01",
        endDate: null,
        isActive: true,
        description: "",
        currentBalance: 50,
        totalTarget: 100,
        totalActual: 150,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["g1"],
      skippedIds: [],
      serverWins: [],
    });

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    const sentChunk = deps.postChunk.mock.calls[0][0];
    const sentGoal = sentChunk[0];
    expect(sentGoal).not.toHaveProperty("_syncStatus");
    expect(sentGoal).not.toHaveProperty("currentBalance");
    expect(sentGoal).not.toHaveProperty("totalTarget");
    expect(sentGoal).not.toHaveProperty("totalActual");
    expect(sentGoal.id).toBe("g1");
    expect(sentGoal.dailyTargetQuantity).toBe(10);
  });

  it("marks synced and failed, and upserts serverWins", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ]);

    const serverWin = {
      id: "g2",
      activityId: "a1",
      user_id: "u1",
      daily_target_quantity: 10,
      start_date: "2025-01-01",
      end_date: null,
      is_active: true,
      description: "",
      debt_cap: null,
      day_targets: null,
      current_balance: 0,
      total_target: 0,
      total_actual: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      deleted_at: null,
    };
    deps.postChunk.mockResolvedValue({
      syncedIds: ["g1"],
      skippedIds: ["g3"],
      serverWins: [serverWin],
    });

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.markGoalsSynced).toHaveBeenCalledWith(["g1"]);
    expect(deps.markGoalsFailed).toHaveBeenCalledWith(["g3"]);
    expect(deps.upsertGoalsFromServer).toHaveBeenCalledTimes(1);
  });

  it("throws when postChunk throws", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ]);
    deps.postChunk.mockRejectedValue(new Error("syncGoals failed: 500"));

    const syncGoals = createSyncGoals(deps);
    await expect(syncGoals()).rejects.toThrow("syncGoals failed");

    expect(deps.markGoalsSynced).not.toHaveBeenCalled();
  });

  it("sends goals in chunks of 100", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `g-${i}`,
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    }));
    deps.getPendingSyncGoals.mockResolvedValue(pending);

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.postChunk).toHaveBeenCalledTimes(2);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
    expect(deps.postChunk.mock.calls[1][0]).toHaveLength(50);
  });

  it("handles exactly 100 items in a single chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 100 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    }));
    deps.getPendingSyncGoals.mockResolvedValue(pending);

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.postChunk).toHaveBeenCalledTimes(1);
    expect(deps.postChunk.mock.calls[0][0]).toHaveLength(100);
  });

  it("processes serverWins per chunk", async () => {
    const deps = createMockDeps();
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    }));
    deps.getPendingSyncGoals.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", activityId: "a2" };
    const sw2 = { id: "sw-2", activityId: "a3" };
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

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.upsertGoalsFromServer).toHaveBeenCalledTimes(2);
  });

  it("does not call upsertGoalsFromServer when no serverWins", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g-0",
        activityId: "a1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ]);
    deps.postChunk.mockResolvedValue({
      syncedIds: ["g-0"],
      skippedIds: [],
      serverWins: [],
    });

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.upsertGoalsFromServer).not.toHaveBeenCalled();
  });

  it("skips DB writes when sync generation changes (H4)", async () => {
    const deps = createMockDeps();
    deps.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ]);
    deps.postChunk.mockImplementation(async () => {
      invalidateSync();
      return {
        syncedIds: ["g1"],
        skippedIds: [],
        serverWins: [{ id: "sw-1" }],
      };
    });

    const syncGoals = createSyncGoals(deps);
    await syncGoals();

    expect(deps.markGoalsSynced).not.toHaveBeenCalled();
    expect(deps.upsertGoalsFromServer).not.toHaveBeenCalled();
  });
});
