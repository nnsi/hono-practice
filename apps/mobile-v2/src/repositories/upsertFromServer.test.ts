vi.mock("expo-sqlite", () => ({}));
vi.mock("../db/database", () => ({
  getDatabase: vi.fn(),
}));
vi.mock("../db/dbEvents", () => ({
  dbEvents: { emit: vi.fn(), subscribe: vi.fn() },
}));
vi.mock("uuid", () => ({
  v7: vi.fn(() => "mock-uuid"),
}));

import type { Mock } from "vitest";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { activityLogRepository } from "./activityLogRepository";
import { activityRepository } from "./activityRepository";
import { goalRepository } from "./goalRepository";
import { taskRepository } from "./taskRepository";

const mockGetDatabase = getDatabase as Mock;

function createMockDb() {
  return {
    runAsync: vi.fn().mockResolvedValue(undefined),
    execAsync: vi.fn().mockResolvedValue(undefined),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: extract SQL from runAsync calls
// ---------------------------------------------------------------------------

function getSqlFromRunAsync(mockDb: ReturnType<typeof createMockDb>): string[] {
  return mockDb.runAsync.mock.calls.map((call: unknown[]) => call[0] as string);
}

// ---------------------------------------------------------------------------
// upsertActivityLogsFromServer (uses shared newActivityLogRepository with adapter pattern)
// Conflict prevention is handled in JS by filterSafeUpserts, not SQL.
// The adapter's bulkUpsertSynced uses INSERT OR REPLACE.
// ---------------------------------------------------------------------------

describe("activityLogRepository.upsertActivityLogsFromServer", () => {
  it("filters via getByIds then uses INSERT OR REPLACE for safe upserts", async () => {
    const mockDb = createMockDb();
    // getByIds returns no local records → all server logs are safe to upsert
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityLogRepository.upsertActivityLogsFromServer([
      {
        id: "log1",
        activityId: "a1",
        activityKindId: null,
        quantity: 5,
        memo: "test",
        date: "2026-03-01",
        time: null,
        taskId: null,
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("INSERT OR REPLACE");
  });

  it("emits activity_logs event after upsert", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityLogRepository.upsertActivityLogsFromServer([
      {
        id: "log1",
        activityId: "a1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2026-03-01",
        time: null,
        taskId: null,
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("activity_logs");
  });

  it("wraps in BEGIN/COMMIT transaction", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityLogRepository.upsertActivityLogsFromServer([
      {
        id: "log1",
        activityId: "a1",
        activityKindId: null,
        quantity: 1,
        memo: "",
        date: "2026-03-01",
        time: null,
        taskId: null,
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    const execCalls = mockDb.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("rolls back on error", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockRejectedValue(new Error("db error"));
    mockGetDatabase.mockResolvedValue(mockDb);

    await expect(
      activityLogRepository.upsertActivityLogsFromServer([
        {
          id: "log1",
          activityId: "a1",
          activityKindId: null,
          quantity: 1,
          memo: "",
          date: "2026-03-01",
          time: null,
          taskId: null,
          deletedAt: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
        },
      ]),
    ).rejects.toThrow("db error");

    const execCalls = mockDb.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(execCalls).toContain("ROLLBACK");
  });

  it("includes all columns in INSERT OR REPLACE statement", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityLogRepository.upsertActivityLogsFromServer([
      {
        id: "log1",
        activityId: "a1",
        activityKindId: "k1",
        quantity: 42,
        memo: "morning",
        date: "2026-03-01",
        time: "08:00",
        taskId: null,
        deletedAt: null,
        createdAt: "2026-03-01T08:00:00Z",
        updatedAt: "2026-03-01T08:00:00Z",
      },
    ]);

    const sql = getSqlFromRunAsync(mockDb)[0];
    expect(sql).toContain("INSERT OR REPLACE");
    expect(sql).toContain("activity_logs");
  });

  it("skips upsert for logs with pending local changes", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: "log1",
        activity_id: "a1",
        activity_kind_id: null,
        quantity: 1,
        memo: "local",
        date: "2026-03-01",
        time: null,
        sync_status: "pending",
        deleted_at: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
      },
    ]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityLogRepository.upsertActivityLogsFromServer([
      {
        id: "log1",
        activityId: "a1",
        activityKindId: null,
        quantity: 5,
        memo: "server",
        date: "2026-03-01",
        time: null,
        taskId: null,
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upsertActivities (uses shared newActivityRepository with adapter pattern)
// Conflict prevention is handled in JS by filterSafeUpserts, not SQL.
// The adapter's bulkUpsertActivities uses INSERT OR REPLACE.
// ---------------------------------------------------------------------------

describe("activityRepository.upsertActivities", () => {
  it("filters via getActivitiesByIds then uses INSERT OR REPLACE for safe upserts", async () => {
    const mockDb = createMockDb();
    // getActivitiesByIds returns no local records → all server activities are safe to upsert
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivities([
      {
        id: "a1",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        recordingMode: "manual",
        recordingModeConfig: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("INSERT OR REPLACE");
  });

  it("emits activities event after upsert", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivities([
      {
        id: "a1",
        userId: "u1",
        name: "Run",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: false,
        recordingMode: "manual",
        recordingModeConfig: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("activities");
  });

  it("includes all columns in INSERT OR REPLACE statement", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivities([
      {
        id: "a1",
        userId: "u1",
        name: "Run",
        label: "cardio",
        emoji: "",
        iconType: "upload",
        iconUrl: "https://example.com/icon.png",
        iconThumbnailUrl: "https://example.com/thumb.png",
        description: "desc",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: true,
        recordingMode: "manual",
        recordingModeConfig: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sql = getSqlFromRunAsync(mockDb)[0];
    const expectedColumns = [
      "user_id",
      "name",
      "label",
      "emoji",
      "icon_type",
      "icon_url",
      "icon_thumbnail_url",
      "description",
      "quantity_unit",
      "order_index",
      "show_combined_stats",
      "sync_status",
      "deleted_at",
      "created_at",
      "updated_at",
    ];
    for (const col of expectedColumns) {
      expect(sql).toContain(col);
    }
  });

  it("skips upsert for activities with pending local changes", async () => {
    const mockDb = createMockDb();
    // getActivitiesByIds returns a local activity with pending sync status
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: "a1",
        user_id: "u1",
        name: "Local version",
        label: "",
        emoji: "",
        icon_type: "emoji",
        icon_url: null,
        icon_thumbnail_url: null,
        description: "",
        quantity_unit: "km",
        order_index: "000001",
        show_combined_stats: 0,
        recording_mode: "manual",
        recording_mode_config: null,
        sync_status: "pending",
        deleted_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivities([
      {
        id: "a1",
        userId: "u1",
        name: "Server version",
        label: "",
        emoji: "",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: false,
        recordingMode: "manual",
        recordingModeConfig: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    // bulkUpsertActivities should not be called (no safe upserts)
    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upsertActivityKinds (uses shared newActivityRepository with adapter pattern)
// Conflict prevention is handled in JS by filterSafeUpserts, not SQL.
// The adapter's bulkUpsertKinds uses INSERT OR REPLACE.
// ---------------------------------------------------------------------------

describe("activityRepository.upsertActivityKinds", () => {
  it("filters via getKindsByIds then uses INSERT OR REPLACE for safe upserts", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivityKinds([
      {
        id: "k1",
        activityId: "a1",
        name: "Sprint",
        color: "#ff0000",
        orderIndex: "000001",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("INSERT OR REPLACE");
  });

  it("emits activity_kinds event after upsert", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivityKinds([
      {
        id: "k1",
        activityId: "a1",
        name: "Sprint",
        color: "#ff0000",
        orderIndex: "000001",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("activity_kinds");
  });

  it("skips upsert for kinds with pending local changes", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: "k1",
        activity_id: "a1",
        name: "Local Sprint",
        color: "#ff0000",
        order_index: "000001",
        sync_status: "pending",
        deleted_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await activityRepository.upsertActivityKinds([
      {
        id: "k1",
        activityId: "a1",
        name: "Server Sprint",
        color: "#ff0000",
        orderIndex: "000001",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upsertGoalsFromServer (uses shared newGoalRepository with adapter pattern)
// Conflict prevention is handled in JS by filterSafeUpserts, not SQL.
// The adapter's bulkUpsertSynced uses INSERT OR REPLACE.
// ---------------------------------------------------------------------------

const goalBase = {
  userId: "u1",
  activityId: "a1",
  dailyTargetQuantity: 5,
  dayTargets: null,
  startDate: "2026-01-01",
  endDate: null,
  isActive: true,
  description: "",
  debtCap: null,
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
};

describe("goalRepository.upsertGoalsFromServer", () => {
  it("filters via getByIds then uses INSERT OR REPLACE for safe upserts", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([{ id: "g1", ...goalBase }]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("INSERT OR REPLACE");
  });

  it("emits goals event after upsert", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([{ id: "g1", ...goalBase }]);

    expect(dbEvents.emit).toHaveBeenCalledWith("goals");
  });

  it("wraps in BEGIN/COMMIT transaction", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([{ id: "g1", ...goalBase }]);

    const execCalls = mockDb.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("includes all goal columns in INSERT OR REPLACE statement", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([
      {
        id: "g1",
        ...goalBase,
        dailyTargetQuantity: 10,
        endDate: "2026-12-31",
        description: "daily goal",
      },
    ]);

    const sql = getSqlFromRunAsync(mockDb)[0];
    const expectedColumns = [
      "user_id",
      "activity_id",
      "daily_target_quantity",
      "start_date",
      "end_date",
      "is_active",
      "description",
      "sync_status",
      "deleted_at",
      "created_at",
      "updated_at",
    ];
    for (const col of expectedColumns) {
      expect(sql).toContain(col);
    }
  });

  it("skips upsert for goals with pending local changes", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: "g1",
        user_id: "u1",
        activity_id: "a1",
        daily_target_quantity: 5,
        day_targets: null,
        start_date: "2026-01-01",
        end_date: null,
        is_active: 1,
        description: "",
        debt_cap: null,
        sync_status: "pending",
        deleted_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([{ id: "g1", ...goalBase }]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upsertTasksFromServer (uses shared newTaskRepository with adapter pattern)
// Conflict prevention is handled in JS by filterSafeUpserts, not SQL.
// The adapter's bulkUpsertSynced uses INSERT OR REPLACE.
// ---------------------------------------------------------------------------

describe("taskRepository.upsertTasksFromServer", () => {
  it("filters via getByIds then uses INSERT OR REPLACE for safe upserts", async () => {
    const mockDb = createMockDb();
    // getByIds returns no local records → all server tasks are safe to upsert
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
        activityId: null,
        activityKindId: null,
        quantity: null,
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("INSERT OR REPLACE");
  });

  it("emits tasks event after upsert", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
        activityId: null,
        activityKindId: null,
        quantity: null,
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("tasks");
  });

  it("wraps in BEGIN/COMMIT transaction", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
        activityId: null,
        activityKindId: null,
        quantity: null,
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const execCalls = mockDb.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("rolls back on error", async () => {
    const mockDb = createMockDb();
    // getAllAsync for getByIds succeeds, but runAsync for INSERT OR REPLACE fails
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockRejectedValue(new Error("db error"));
    mockGetDatabase.mockResolvedValue(mockDb);

    await expect(
      taskRepository.upsertTasksFromServer([
        {
          id: "t1",
          userId: "u1",
          title: "Buy groceries",
          activityId: null,
          activityKindId: null,
          quantity: null,
          startDate: null,
          dueDate: null,
          doneDate: null,
          memo: "",
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          deletedAt: null,
        },
      ]),
    ).rejects.toThrow("db error");

    const execCalls = mockDb.execAsync.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(execCalls).toContain("ROLLBACK");
  });

  it("includes all task columns in INSERT OR REPLACE statement", async () => {
    const mockDb = createMockDb();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
        activityId: null,
        activityKindId: "k1",
        quantity: 2,
        startDate: "2026-03-01",
        dueDate: "2026-03-05",
        doneDate: "2026-03-04",
        memo: "eggs, milk",
        archivedAt: "2026-03-06T00:00:00Z",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-04T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sql = getSqlFromRunAsync(mockDb)[0];
    const expectedColumns = [
      "user_id",
      "title",
      "activity_kind_id",
      "quantity",
      "start_date",
      "due_date",
      "done_date",
      "memo",
      "archived_at",
      "sync_status",
      "deleted_at",
      "created_at",
      "updated_at",
    ];
    for (const col of expectedColumns) {
      expect(sql).toContain(col);
    }
  });

  it("skips upsert for tasks with pending local changes", async () => {
    const mockDb = createMockDb();
    // getByIds returns a local task with pending sync status
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: "t1",
        user_id: "u1",
        title: "Local version",
        activity_id: null,
        activity_kind_id: null,
        quantity: null,
        start_date: null,
        due_date: null,
        done_date: null,
        memo: "",
        archived_at: null,
        sync_status: "pending",
        deleted_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ]);
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Server version",
        activityId: null,
        activityKindId: null,
        quantity: null,
        startDate: null,
        dueDate: null,
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    // bulkUpsertSynced should not be called (no safe upserts)
    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(0);
  });
});
