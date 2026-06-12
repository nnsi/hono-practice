import { beforeEach, describe, expect, it, vi } from "vitest";

import { createV2SyncFunctions } from "./createV2SyncFunctions";

const okSyncResult = (over: Partial<Record<string, unknown>> = {}) => ({
  ok: true,
  status: 200,
  json: () =>
    Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [], ...over }),
});

function createMockApi() {
  return {
    postActivityLogs: vi.fn().mockResolvedValue(okSyncResult()),
    postGoals: vi.fn().mockResolvedValue(okSyncResult()),
    postTasks: vi.fn().mockResolvedValue(okSyncResult()),
    postNotes: vi.fn().mockResolvedValue(okSyncResult()),
    postGoalFreezePeriods: vi.fn().mockResolvedValue(okSyncResult()),
  };
}

function createMockRepos() {
  return {
    activityLog: {
      getPendingSyncActivityLogs: vi.fn().mockResolvedValue([]),
      markActivityLogsSynced: vi.fn().mockResolvedValue(undefined),
      markActivityLogsFailed: vi.fn().mockResolvedValue(undefined),
      upsertActivityLogsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    goal: {
      getPendingSyncGoals: vi.fn().mockResolvedValue([]),
      markGoalsSynced: vi.fn().mockResolvedValue(undefined),
      markGoalsFailed: vi.fn().mockResolvedValue(undefined),
      upsertGoalsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    task: {
      getPendingSyncTasks: vi.fn().mockResolvedValue([]),
      markTasksSynced: vi.fn().mockResolvedValue(undefined),
      markTasksFailed: vi.fn().mockResolvedValue(undefined),
      upsertTasksFromServer: vi.fn().mockResolvedValue(undefined),
    },
    note: {
      getPendingSyncNotes: vi.fn().mockResolvedValue([]),
      markNotesSynced: vi.fn().mockResolvedValue(undefined),
      markNotesFailed: vi.fn().mockResolvedValue(undefined),
      upsertNotesFromServer: vi.fn().mockResolvedValue(undefined),
    },
    goalFreezePeriod: {
      getPendingSyncFreezePeriods: vi.fn().mockResolvedValue([]),
      markFreezePeriodsSynced: vi.fn().mockResolvedValue(undefined),
      markFreezePeriodsFailed: vi.fn().mockResolvedValue(undefined),
      upsertFreezePeriodsFromServer: vi.fn().mockResolvedValue(undefined),
    },
  };
}

const pendingGoal = {
  id: "9f3c8bb0-0000-4000-8000-000000000001",
  activityId: "9f3c8bb0-0000-4000-8000-000000000002",
  dailyTargetQuantity: 10,
  startDate: "2025-01-01",
  endDate: null,
  isActive: true,
  description: "",
  debtCap: null,
  dayTargets: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "pending",
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
};

describe("createV2SyncFunctions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the five standard entity sync functions", () => {
    const fns = createV2SyncFunctions({
      api: createMockApi(),
      repos: createMockRepos(),
    });
    expect(Object.keys(fns).sort()).toEqual([
      "syncActivityLogs",
      "syncGoalFreezePeriods",
      "syncGoals",
      "syncNotes",
      "syncTasks",
    ]);
  });

  it("posts pending activity logs without _syncStatus and marks results", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.activityLog.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", quantity: 5, _syncStatus: "pending" },
    ]);
    api.postActivityLogs.mockResolvedValue(
      okSyncResult({ syncedIds: ["l1"], skippedIds: ["l2"] }),
    );

    const fns = createV2SyncFunctions({ api, repos });
    await fns.syncActivityLogs();

    expect(api.postActivityLogs).toHaveBeenCalledWith({
      logs: [{ id: "l1", quantity: 5 }],
    });
    expect(repos.activityLog.markActivityLogsSynced).toHaveBeenCalledWith([
      "l1",
    ]);
    expect(repos.activityLog.markActivityLogsFailed).toHaveBeenCalledWith([
      "l2",
    ]);
  });

  it("throws when the endpoint responds non-ok", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.task.getPendingSyncTasks.mockResolvedValue([
      { id: "t1", _syncStatus: "pending" },
    ]);
    api.postTasks.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const fns = createV2SyncFunctions({ api, repos });
    await expect(fns.syncTasks()).rejects.toThrow("syncTasks failed: 500");
    expect(repos.task.markTasksSynced).not.toHaveBeenCalled();
  });

  it("validates goals against UpsertGoalRequestSchema and strips server-computed fields", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.goal.getPendingSyncGoals.mockResolvedValue([pendingGoal]);
    api.postGoals.mockResolvedValue(
      okSyncResult({ syncedIds: [pendingGoal.id] }),
    );

    const fns = createV2SyncFunctions({ api, repos });
    await fns.syncGoals();

    const sent = api.postGoals.mock.calls[0][0].goals[0];
    expect(sent.id).toBe(pendingGoal.id);
    expect(sent).not.toHaveProperty("_syncStatus");
    expect(sent).not.toHaveProperty("currentBalance");
    expect(sent).not.toHaveProperty("totalTarget");
    expect(sent).not.toHaveProperty("totalActual");
    expect(repos.goal.markGoalsSynced).toHaveBeenCalledWith([pendingGoal.id]);
  });

  it("rejects invalid goal payloads before hitting the network", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.goal.getPendingSyncGoals.mockResolvedValue([
      { ...pendingGoal, id: "not-a-uuid" },
    ]);

    const fns = createV2SyncFunctions({ api, repos });
    await expect(fns.syncGoals()).rejects.toThrow();
    expect(api.postGoals).not.toHaveBeenCalled();
  });

  it("upserts server wins through the repositories", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.note.getPendingSyncNotes.mockResolvedValue([
      { id: "n1", _syncStatus: "pending" },
    ]);
    api.postNotes.mockResolvedValue(
      okSyncResult({
        syncedIds: [],
        skippedIds: ["n1"],
        serverWins: [
          {
            id: "n1",
            title: "Server note",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-02T00:00:00.000Z",
            deletedAt: null,
          },
        ],
      }),
    );

    const fns = createV2SyncFunctions({ api, repos });
    await fns.syncNotes();

    expect(repos.note.upsertNotesFromServer).toHaveBeenCalledTimes(1);
    const wins = repos.note.upsertNotesFromServer.mock.calls[0][0];
    expect(wins[0].id).toBe("n1");
  });

  it("posts pending freeze periods to the freeze period endpoint", async () => {
    const api = createMockApi();
    const repos = createMockRepos();
    repos.goalFreezePeriod.getPendingSyncFreezePeriods.mockResolvedValue([
      { id: "f1", goalId: "g1", _syncStatus: "pending" },
    ]);
    api.postGoalFreezePeriods.mockResolvedValue(
      okSyncResult({ syncedIds: ["f1"] }),
    );

    const fns = createV2SyncFunctions({ api, repos });
    await fns.syncGoalFreezePeriods();

    expect(api.postGoalFreezePeriods).toHaveBeenCalledWith({
      freezePeriods: [{ id: "f1", goalId: "g1" }],
    });
    expect(repos.goalFreezePeriod.markFreezePeriodsSynced).toHaveBeenCalledWith(
      ["f1"],
    );
  });
});
