vi.mock("../db/database", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("../repositories/activityRepository", () => ({
  activityRepository: {
    upsertActivities: vi.fn().mockResolvedValue(undefined),
    upsertActivityKinds: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../repositories/activityLogRepository", () => ({
  activityLogRepository: {
    upsertActivityLogsFromServer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../repositories/goalRepository", () => ({
  goalRepository: {
    upsertGoalsFromServer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../repositories/goalFreezePeriodRepository", () => ({
  goalFreezePeriodRepository: {
    upsertFreezePeriodsFromServer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../repositories/taskRepository", () => ({
  taskRepository: {
    upsertTasksFromServer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../utils/apiClient", () => ({
  apiClient: {
    users: {
      v2: {
        activities: { $get: vi.fn() },
        "activity-logs": { $get: vi.fn() },
        goals: { $get: vi.fn() },
        "goal-freeze-periods": { $get: vi.fn() },
        tasks: { $get: vi.fn() },
      },
    },
  },
}));

vi.mock("./rnPlatformAdapters", () => ({
  rnStorageAdapter: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@packages/sync-engine/mappers/apiMappers", () => ({
  mapApiActivity: vi.fn((x: unknown) => x),
  mapApiActivityKind: vi.fn((x: unknown) => x),
  mapApiActivityLog: vi.fn((x: unknown) => x),
  mapApiGoal: vi.fn((x: unknown) => x),
  mapApiGoalFreezePeriod: vi.fn((x: unknown) => x),
  mapApiTask: vi.fn((x: unknown) => x),
}));

import { getDatabase } from "../db/database";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { activityRepository } from "../repositories/activityRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { taskRepository } from "../repositories/taskRepository";
import { apiClient } from "../utils/apiClient";
import { clearLocalData, performInitialSync } from "./initialSync";

function createMockDb() {
  return {
    execAsync: vi.fn().mockResolvedValue(undefined),
    runAsync: vi.fn().mockResolvedValue(undefined),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    getAllAsync: vi.fn().mockResolvedValue([]),
    withTransactionAsync: vi
      .fn()
      .mockImplementation(async (fn: () => Promise<void>) => fn()),
  };
}

function okResponse(data: unknown) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) };
}

function errorResponse() {
  return { ok: false };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clearLocalData", () => {
  it("deletes all tables except auth_state", async () => {
    const mockDb = createMockDb();
    vi.mocked(getDatabase).mockResolvedValue(mockDb as never);

    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    await clearLocalData(mockStorage);

    expect(mockDb.execAsync).toHaveBeenCalledTimes(1);
    const sql = mockDb.execAsync.mock.calls[0][0] as string;
    expect(sql).toContain("DELETE FROM activity_logs");
    expect(sql).toContain("DELETE FROM activities");
    expect(sql).toContain("DELETE FROM activity_kinds");
    expect(sql).toContain("DELETE FROM goals");
    expect(sql).toContain("DELETE FROM goal_freeze_periods");
    expect(sql).toContain("DELETE FROM tasks");
    expect(sql).toContain("DELETE FROM activity_icon_blobs");
    expect(sql).toContain("DELETE FROM activity_icon_delete_queue");
    expect(sql).not.toContain("auth_state");
  });

  it("removes LAST_SYNCED_KEY from storage", async () => {
    const mockDb = createMockDb();
    vi.mocked(getDatabase).mockResolvedValue(mockDb as never);

    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    await clearLocalData(mockStorage);

    expect(mockStorage.removeItem).toHaveBeenCalledWith(
      "actiko-v2-lastSyncedAt",
    );
  });
});

describe("performInitialSync", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockStorage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  const activitiesApi = apiClient.users.v2.activities.$get;
  const logsApi = apiClient.users.v2["activity-logs"].$get;
  const goalsApi = apiClient.users.v2.goals.$get;
  const freezePeriodsApi = apiClient.users.v2["goal-freeze-periods"].$get;
  const tasksApi = apiClient.users.v2.tasks.$get;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.mocked(getDatabase).mockResolvedValue(mockDb as never);

    mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    vi.mocked(activitiesApi).mockResolvedValue(
      okResponse({ activities: [], activityKinds: [] }) as never,
    );
    vi.mocked(logsApi).mockResolvedValue(okResponse({ logs: [] }) as never);
    vi.mocked(goalsApi).mockResolvedValue(okResponse({ goals: [] }) as never);
    vi.mocked(freezePeriodsApi).mockResolvedValue(
      okResponse({ freezePeriods: [] }) as never,
    );
    vi.mocked(tasksApi).mockResolvedValue(okResponse({ tasks: [] }) as never);
  });

  it("updates auth_state with userId", async () => {
    await performInitialSync("user-123", mockStorage);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO auth_state"),
      expect.arrayContaining(["user-123"]),
    );
  });

  it("performs full sync when no lastSyncedAt", async () => {
    mockStorage.getItem.mockReturnValue(null);

    await performInitialSync("user-1", mockStorage);

    expect(logsApi).toHaveBeenCalledWith({ query: {} });
    expect(goalsApi).toHaveBeenCalledWith({ query: {} });
    expect(tasksApi).toHaveBeenCalledWith({ query: {} });
  });

  it("performs delta sync when lastSyncedAt exists and DB has data", async () => {
    mockStorage.getItem.mockReturnValue("2025-01-01T00:00:00.000Z");
    mockDb.getFirstAsync.mockResolvedValue({ count: 5 });

    await performInitialSync("user-1", mockStorage);

    expect(logsApi).toHaveBeenCalledWith({
      query: { since: "2025-01-01T00:00:00.000Z" },
    });
    expect(goalsApi).toHaveBeenCalledWith({
      query: { since: "2025-01-01T00:00:00.000Z" },
    });
    expect(tasksApi).toHaveBeenCalledWith({
      query: { since: "2025-01-01T00:00:00.000Z" },
    });
  });

  it("discards lastSyncedAt and does full sync when DB is empty", async () => {
    mockStorage.getItem.mockReturnValue("2025-01-01T00:00:00.000Z");
    mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

    await performInitialSync("user-1", mockStorage);

    expect(mockStorage.removeItem).toHaveBeenCalledWith(
      "actiko-v2-lastSyncedAt",
    );
    expect(logsApi).toHaveBeenCalledWith({ query: {} });
    expect(goalsApi).toHaveBeenCalledWith({ query: {} });
    expect(tasksApi).toHaveBeenCalledWith({ query: {} });
  });

  it("upserts data from successful API responses", async () => {
    vi.mocked(activitiesApi).mockResolvedValue(
      okResponse({
        activities: [{ id: "a1" }],
        activityKinds: [{ id: "ak1" }],
      }) as never,
    );
    vi.mocked(logsApi).mockResolvedValue(
      okResponse({ logs: [{ id: "l1" }] }) as never,
    );
    vi.mocked(goalsApi).mockResolvedValue(
      okResponse({ goals: [{ id: "g1" }] }) as never,
    );
    vi.mocked(tasksApi).mockResolvedValue(
      okResponse({ tasks: [{ id: "t1" }] }) as never,
    );

    await performInitialSync("user-1", mockStorage);

    expect(activityRepository.upsertActivities).toHaveBeenCalledWith([
      { id: "a1" },
    ]);
    expect(activityRepository.upsertActivityKinds).toHaveBeenCalledWith([
      { id: "ak1" },
    ]);
    expect(
      activityLogRepository.upsertActivityLogsFromServer,
    ).toHaveBeenCalledWith([{ id: "l1" }]);
    expect(goalRepository.upsertGoalsFromServer).toHaveBeenCalledWith([
      { id: "g1" },
    ]);
    expect(taskRepository.upsertTasksFromServer).toHaveBeenCalledWith([
      { id: "t1" },
    ]);
  });

  it("upserts freeze periods from successful API response", async () => {
    vi.mocked(freezePeriodsApi).mockResolvedValue(
      okResponse({ freezePeriods: [{ id: "fp1" }] }) as never,
    );

    await performInitialSync("user-1", mockStorage);

    expect(
      goalFreezePeriodRepository.upsertFreezePeriodsFromServer,
    ).toHaveBeenCalledWith([{ id: "fp1" }]);
  });

  it("skips upsert for failed API responses", async () => {
    vi.mocked(goalsApi).mockResolvedValue(errorResponse() as never);

    vi.mocked(activitiesApi).mockResolvedValue(
      okResponse({
        activities: [{ id: "a1" }],
        activityKinds: [],
      }) as never,
    );
    vi.mocked(logsApi).mockResolvedValue(
      okResponse({ logs: [{ id: "l1" }] }) as never,
    );
    vi.mocked(tasksApi).mockResolvedValue(
      okResponse({ tasks: [{ id: "t1" }] }) as never,
    );

    await performInitialSync("user-1", mockStorage);

    expect(activityRepository.upsertActivities).toHaveBeenCalled();
    expect(
      activityLogRepository.upsertActivityLogsFromServer,
    ).toHaveBeenCalled();
    expect(taskRepository.upsertTasksFromServer).toHaveBeenCalled();
    expect(goalRepository.upsertGoalsFromServer).not.toHaveBeenCalled();
  });

  it("updates lastSyncedAt only when ALL APIs succeed", async () => {
    await performInitialSync("user-1", mockStorage);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "actiko-v2-lastSyncedAt",
      expect.any(String),
    );
  });

  it("does NOT update lastSyncedAt when any API fails", async () => {
    vi.mocked(goalsApi).mockResolvedValue(errorResponse() as never);

    await performInitialSync("user-1", mockStorage);

    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("does NOT update lastSyncedAt when freeze periods API fails", async () => {
    vi.mocked(freezePeriodsApi).mockRejectedValue(new Error("network"));

    await performInitialSync("user-1", mockStorage);

    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it("handles empty data arrays gracefully", async () => {
    vi.mocked(activitiesApi).mockResolvedValue(
      okResponse({ activities: [], activityKinds: [] }) as never,
    );
    vi.mocked(logsApi).mockResolvedValue(okResponse({ logs: [] }) as never);
    vi.mocked(goalsApi).mockResolvedValue(okResponse({ goals: [] }) as never);
    vi.mocked(tasksApi).mockResolvedValue(okResponse({ tasks: [] }) as never);

    await performInitialSync("user-1", mockStorage);

    // 全データが空の場合、トランザクション自体がスキップされupsertは呼ばれない
    expect(activityRepository.upsertActivities).not.toHaveBeenCalled();
    expect(activityRepository.upsertActivityKinds).not.toHaveBeenCalled();
    expect(
      activityLogRepository.upsertActivityLogsFromServer,
    ).not.toHaveBeenCalled();
    expect(goalRepository.upsertGoalsFromServer).not.toHaveBeenCalled();
    expect(taskRepository.upsertTasksFromServer).not.toHaveBeenCalled();
  });
});
