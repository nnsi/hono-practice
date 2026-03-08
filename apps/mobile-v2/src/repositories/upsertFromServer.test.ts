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
  return mockDb.runAsync.mock.calls.map(
    (call: [string, ...unknown[]]) => call[0],
  );
}

// ---------------------------------------------------------------------------
// upsertActivityLogsFromServer
// ---------------------------------------------------------------------------

describe("activityLogRepository.upsertActivityLogsFromServer", () => {
  it("uses ON CONFLICT(id) DO UPDATE with WHERE sync_status <> 'pending' AND updatedAt guard", async () => {
    const mockDb = createMockDb();
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
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain("WHERE sync_status <> 'pending'");
    expect(sql).toContain("updated_at <= excluded.updated_at");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("emits activity_logs event after upsert", async () => {
    const mockDb = createMockDb();
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
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("activity_logs");
  });

  it("wraps in BEGIN/COMMIT transaction", async () => {
    const mockDb = createMockDb();
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
        deletedAt: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]);

    const execCalls = mockDb.execAsync.mock.calls.map((c: [string]) => c[0]);
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("rolls back on error", async () => {
    const mockDb = createMockDb();
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
          deletedAt: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
        },
      ]),
    ).rejects.toThrow("db error");

    const execCalls = mockDb.execAsync.mock.calls.map((c: [string]) => c[0]);
    expect(execCalls).toContain("ROLLBACK");
  });

  it("passes all columns in correct order", async () => {
    const mockDb = createMockDb();
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
        deletedAt: null,
        createdAt: "2026-03-01T08:00:00Z",
        updatedAt: "2026-03-01T08:00:00Z",
      },
    ]);

    const params = mockDb.runAsync.mock.calls[0][1];
    expect(params).toEqual([
      "log1",
      "a1",
      "k1",
      42,
      "morning",
      "2026-03-01",
      "08:00",
      null,
      "2026-03-01T08:00:00Z",
      "2026-03-01T08:00:00Z",
    ]);
  });
});

// ---------------------------------------------------------------------------
// upsertActivities
// ---------------------------------------------------------------------------

describe("activityRepository.upsertActivities", () => {
  it("uses ON CONFLICT(id) DO UPDATE with WHERE sync_status <> 'pending' AND updatedAt guard", async () => {
    const mockDb = createMockDb();
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
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain("WHERE sync_status <> 'pending'");
    expect(sql).toContain("updated_at <= excluded.updated_at");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("emits activities event after upsert", async () => {
    const mockDb = createMockDb();
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
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("activities");
  });

  it("includes all columns in ON CONFLICT SET clause", async () => {
    const mockDb = createMockDb();
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
});

// ---------------------------------------------------------------------------
// upsertActivityKinds
// ---------------------------------------------------------------------------

describe("activityRepository.upsertActivityKinds", () => {
  it("uses ON CONFLICT(id) DO UPDATE with WHERE sync_status <> 'pending' AND updatedAt guard", async () => {
    const mockDb = createMockDb();
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
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain("WHERE sync_status <> 'pending'");
    expect(sql).toContain("updated_at <= excluded.updated_at");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("emits activity_kinds event after upsert", async () => {
    const mockDb = createMockDb();
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
});

// ---------------------------------------------------------------------------
// upsertGoalsFromServer
// ---------------------------------------------------------------------------

describe("goalRepository.upsertGoalsFromServer", () => {
  it("uses ON CONFLICT(id) DO UPDATE with WHERE sync_status <> 'pending' AND updatedAt guard", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([
      {
        id: "g1",
        userId: "u1",
        activityId: "a1",
        dailyTargetQuantity: 5,
        startDate: "2026-01-01",
        endDate: null,
        isActive: true,
        description: "",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const sqls = getSqlFromRunAsync(mockDb);
    expect(sqls).toHaveLength(1);

    const sql = sqls[0];
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain("WHERE sync_status <> 'pending'");
    expect(sql).toContain("updated_at <= excluded.updated_at");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("emits goals event after upsert", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([
      {
        id: "g1",
        userId: "u1",
        activityId: "a1",
        dailyTargetQuantity: 5,
        startDate: "2026-01-01",
        endDate: null,
        isActive: true,
        description: "",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    expect(dbEvents.emit).toHaveBeenCalledWith("goals");
  });

  it("wraps in BEGIN/COMMIT transaction", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([
      {
        id: "g1",
        userId: "u1",
        activityId: "a1",
        dailyTargetQuantity: 5,
        startDate: "2026-01-01",
        endDate: null,
        isActive: true,
        description: "",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
      },
    ]);

    const execCalls = mockDb.execAsync.mock.calls.map((c: [string]) => c[0]);
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("includes all goal columns in ON CONFLICT SET clause", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await goalRepository.upsertGoalsFromServer([
      {
        id: "g1",
        userId: "u1",
        activityId: "a1",
        dailyTargetQuantity: 10,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        isActive: true,
        description: "daily goal",
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
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
});

// ---------------------------------------------------------------------------
// upsertTasksFromServer
// ---------------------------------------------------------------------------

describe("taskRepository.upsertTasksFromServer", () => {
  it("uses ON CONFLICT(id) DO UPDATE with WHERE sync_status <> 'pending' AND updatedAt guard", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
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
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain("WHERE sync_status <> 'pending'");
    expect(sql).toContain("updated_at <= excluded.updated_at");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("emits tasks event after upsert", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
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
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
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

    const execCalls = mockDb.execAsync.mock.calls.map((c: [string]) => c[0]);
    expect(execCalls[0]).toBe("BEGIN");
    expect(execCalls[1]).toBe("COMMIT");
  });

  it("rolls back on error", async () => {
    const mockDb = createMockDb();
    mockDb.runAsync.mockRejectedValue(new Error("db error"));
    mockGetDatabase.mockResolvedValue(mockDb);

    await expect(
      taskRepository.upsertTasksFromServer([
        {
          id: "t1",
          userId: "u1",
          title: "Buy groceries",
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

    const execCalls = mockDb.execAsync.mock.calls.map((c: [string]) => c[0]);
    expect(execCalls).toContain("ROLLBACK");
  });

  it("includes all task columns in ON CONFLICT SET clause", async () => {
    const mockDb = createMockDb();
    mockGetDatabase.mockResolvedValue(mockDb);

    await taskRepository.upsertTasksFromServer([
      {
        id: "t1",
        userId: "u1",
        title: "Buy groceries",
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
});
