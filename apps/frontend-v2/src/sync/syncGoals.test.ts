import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/goalRepository");
vi.mock("@packages/domain/sync/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { goalRepository } from "../db/goalRepository";
import { mapApiGoal } from "@packages/domain/sync/apiMappers";
import { syncGoals } from "./syncGoals";

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

  it("does not process when API returns not ok", async () => {
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

    await syncGoals();

    expect(mockGoalRepo.markGoalsSynced).not.toHaveBeenCalled();
  });
});
