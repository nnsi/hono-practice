import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/goalRepository");
vi.mock("@packages/sync-engine/mappers/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { mapApiGoal } from "@packages/sync-engine/mappers/apiMappers";

import { goalRepository } from "../db/goalRepository";
import { syncGoals } from "./syncGoals";
import { invalidateSync } from "./syncState";

const mockGoalRepo = vi.mocked(goalRepository);

describe("syncGoals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiGoal).mockImplementation((g: any) => g);
  });

  it("skips when no pending goals", async () => {
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue([]);

    await syncGoals();

    expect(mockGoalRepo.markGoalsSynced).not.toHaveBeenCalled();
  });

  it("strips _syncStatus AND computed fields before sending", async () => {
    const pending = [
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
        _syncStatus: "pending" as const,
      },
    ];
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["g1"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    const sentJson = mockPost.mock.calls[0][0].json;
    const sentGoal = sentJson.goals[0];
    expect(sentGoal).not.toHaveProperty("_syncStatus");
    expect(sentGoal).not.toHaveProperty("currentBalance");
    expect(sentGoal).not.toHaveProperty("totalTarget");
    expect(sentGoal).not.toHaveProperty("totalActual");
    expect(sentGoal.id).toBe("g1");
    expect(sentGoal.dailyTargetQuantity).toBe(10);
  });

  it("marks synced and failed, and upserts serverWins", async () => {
    const pending = [
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ];
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending as any);

    const serverWin = { id: "g2", activityId: "a1" };
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["g1"],
          skippedIds: ["g3"],
          serverWins: [serverWin],
        }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockGoalRepo.markGoalsSynced).toHaveBeenCalledWith(["g1"]);
    expect(mockGoalRepo.markGoalsFailed).toHaveBeenCalledWith(["g3"]);
    expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenCalledWith([
      serverWin,
    ]);
  });

  it("throws when API returns not ok (H5)", async () => {
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await expect(syncGoals()).rejects.toThrow("syncGoals failed");

    expect(mockGoalRepo.markGoalsSynced).not.toHaveBeenCalled();
  });

  it("sends goals in chunks of 100", async () => {
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `g-${i}`,
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    })) as any;
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending);

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
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][0].json.goals).toHaveLength(100);
    expect(mockPost.mock.calls[1][0].json.goals).toHaveLength(50);
  });

  it("handles exactly 100 items in a single chunk", async () => {
    const pending = Array.from({ length: 100 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    })) as any;
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [] }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0].json.goals).toHaveLength(100);
  });

  it("splits 101 items into 2 chunks (100 + 1)", async () => {
    const pending = Array.from({ length: 101 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    })) as any;
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [] }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][0].json.goals).toHaveLength(100);
    expect(mockPost.mock.calls[1][0].json.goals).toHaveLength(1);
  });

  it("throws on second chunk failure but marks first chunk as synced", async () => {
    const pending = Array.from({ length: 200 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    })) as any;
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending);

    const firstChunkIds = Array.from({ length: 100 }, (_, i) => `g-${i}`);
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
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await expect(syncGoals()).rejects.toThrow("syncGoals failed");

    // 成功した第1チャンクはmark済み、第2チャンクは失敗でmarkされない
    expect(mockGoalRepo.markGoalsSynced).toHaveBeenCalledTimes(1);
    expect(mockGoalRepo.markGoalsSynced).toHaveBeenCalledWith(firstChunkIds);
    expect(mockGoalRepo.markGoalsFailed).toHaveBeenCalledTimes(1);
    expect(mockGoalRepo.markGoalsFailed).toHaveBeenCalledWith([]);
  });

  it("upserts multiple serverWins from server response", async () => {
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g-0",
        activityId: "a1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ] as any);

    const serverWins = [
      { id: "sw-1", activityId: "a2", dailyTargetQuantity: 20 },
      { id: "sw-2", activityId: "a3", dailyTargetQuantity: 30 },
    ];
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ syncedIds: ["g-0"], skippedIds: [], serverWins }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenCalledWith(serverWins);
  });

  it("processes serverWins per chunk", async () => {
    const pending = Array.from({ length: 150 }, (_, i) => ({
      id: `g-${i}`,
      activityId: "a1",
      _syncStatus: "pending",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
    })) as any;
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue(pending);

    const sw1 = { id: "sw-1", activityId: "a2" };
    const sw2 = { id: "sw-2", activityId: "a3" };
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
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    // チャンクごとに個別にupsert（一括mergeではない）
    expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenCalledTimes(2);
    expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenNthCalledWith(1, [
      sw1,
    ]);
    expect(mockGoalRepo.upsertGoalsFromServer).toHaveBeenNthCalledWith(2, [
      sw2,
    ]);
  });

  it("does not call upsertGoalsFromServer when no serverWins", async () => {
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g-0",
        activityId: "a1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["g-0"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockGoalRepo.upsertGoalsFromServer).not.toHaveBeenCalled();
  });

  it("skips DB writes when sync generation changes (H4)", async () => {
    mockGoalRepo.getPendingSyncGoals.mockResolvedValue([
      {
        id: "g1",
        _syncStatus: "pending",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
      },
    ] as any);

    const mockPost = vi.fn().mockImplementation(async () => {
      invalidateSync();
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            syncedIds: ["g1"],
            skippedIds: [],
            serverWins: [{ id: "sw-1" }],
          }),
      };
    });
    mockApiClientObj.users = {
      v2: { goals: { sync: { $post: mockPost } } },
    };

    await syncGoals();

    expect(mockGoalRepo.markGoalsSynced).not.toHaveBeenCalled();
    expect(mockGoalRepo.upsertGoalsFromServer).not.toHaveBeenCalled();
  });
});
