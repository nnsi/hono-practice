vi.mock("expo-sqlite", () => ({}));
vi.mock("./database", () => ({
  getDatabase: vi.fn(),
}));
vi.mock("./dbEvents", () => ({
  dbEvents: { emit: vi.fn(), subscribe: vi.fn() },
}));
vi.mock("uuid", () => ({
  v7: vi.fn(() => "mock-uuid"),
}));

import { mapActivityLogRow } from "../repositories/activityLogRepository";
import {
  mapActivityKindRow,
  mapActivityRow,
} from "../repositories/activityRepository";
import { mapGoalRow } from "../repositories/goalRepository";
import { mapTaskRow } from "../repositories/taskRepository";

// ---------------------------------------------------------------------------
// mapActivityRow
// ---------------------------------------------------------------------------

describe("mapActivityRow", () => {
  it("maps complete SQL row to ActivityWithSync", () => {
    const row = {
      id: "abc",
      user_id: "u1",
      name: "Running",
      label: "run",
      emoji: "\u{1F3C3}",
      icon_type: "emoji",
      icon_url: null,
      icon_thumbnail_url: null,
      description: "desc",
      quantity_unit: "km",
      order_index: "000001",
      show_combined_stats: 1,
      recording_mode: "timer",
      recording_mode_config: '{"mode":"counter","steps":[1,5]}',
      created_at: "2025-01-01",
      updated_at: "2025-01-02",
      deleted_at: null,
      sync_status: "pending",
    };
    const result = mapActivityRow(row);
    expect(result).toEqual({
      id: "abc",
      userId: "u1",
      name: "Running",
      label: "run",
      emoji: "\u{1F3C3}",
      iconType: "emoji",
      iconUrl: null,
      iconThumbnailUrl: null,
      description: "desc",
      quantityUnit: "km",
      orderIndex: "000001",
      showCombinedStats: true,
      recordingMode: "timer",
      recordingModeConfig: '{"mode":"counter","steps":[1,5]}',
      createdAt: "2025-01-01",
      updatedAt: "2025-01-02",
      deletedAt: null,
      _syncStatus: "pending",
    });
  });

  it("handles null/undefined values with defaults", () => {
    const row = {}; // all undefined
    const result = mapActivityRow(row);
    expect(result.id).toBe("");
    expect(result.userId).toBe("");
    expect(result.name).toBe("");
    expect(result.iconUrl).toBeNull();
    expect(result.iconThumbnailUrl).toBeNull();
    expect(result.iconType).toBe("emoji");
    expect(result.showCombinedStats).toBe(false);
    expect(result.recordingMode).toBe("manual");
    expect(result.recordingModeConfig).toBeNull();
    expect(result._syncStatus).toBe("synced");
    expect(result.deletedAt).toBeNull();
  });

  it("falls back to 'emoji' for invalid icon_type", () => {
    expect(mapActivityRow({ icon_type: "invalid" }).iconType).toBe("emoji");
    expect(mapActivityRow({ icon_type: 123 }).iconType).toBe("emoji");
  });

  it("accepts valid icon_type values", () => {
    expect(mapActivityRow({ icon_type: "emoji" }).iconType).toBe("emoji");
    expect(mapActivityRow({ icon_type: "upload" }).iconType).toBe("upload");
  });

  it("falls back to 'synced' for invalid sync_status", () => {
    expect(mapActivityRow({ sync_status: "unknown" })._syncStatus).toBe(
      "synced",
    );
    expect(mapActivityRow({ sync_status: 42 })._syncStatus).toBe("synced");
  });

  it("accepts valid sync_status values", () => {
    expect(mapActivityRow({ sync_status: "pending" })._syncStatus).toBe(
      "pending",
    );
    expect(mapActivityRow({ sync_status: "synced" })._syncStatus).toBe(
      "synced",
    );
    expect(mapActivityRow({ sync_status: "failed" })._syncStatus).toBe(
      "failed",
    );
  });

  it("coerces show_combined_stats strictly with ===1", () => {
    expect(mapActivityRow({ show_combined_stats: 1 }).showCombinedStats).toBe(
      true,
    );
    expect(mapActivityRow({ show_combined_stats: 0 }).showCombinedStats).toBe(
      false,
    );
    expect(
      mapActivityRow({ show_combined_stats: true }).showCombinedStats,
    ).toBe(false);
    expect(mapActivityRow({ show_combined_stats: "1" }).showCombinedStats).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// mapActivityKindRow
// ---------------------------------------------------------------------------

describe("mapActivityKindRow", () => {
  it("maps complete SQL row to ActivityKindWithSync", () => {
    const row = {
      id: "k1",
      activity_id: "a1",
      name: "Sprint",
      color: "#ff0000",
      order_index: "000002",
      created_at: "2025-02-01",
      updated_at: "2025-02-02",
      deleted_at: null,
      sync_status: "synced",
    };
    const result = mapActivityKindRow(row);
    expect(result).toEqual({
      id: "k1",
      activityId: "a1",
      name: "Sprint",
      color: "#ff0000",
      orderIndex: "000002",
      createdAt: "2025-02-01",
      updatedAt: "2025-02-02",
      deletedAt: null,
      _syncStatus: "synced",
    });
  });

  it("handles null/undefined values with defaults", () => {
    const result = mapActivityKindRow({});
    expect(result.id).toBe("");
    expect(result.activityId).toBe("");
    expect(result.name).toBe("");
    expect(result.color).toBeNull();
    expect(result.orderIndex).toBe("");
    expect(result.deletedAt).toBeNull();
    expect(result._syncStatus).toBe("synced");
  });

  it("returns null for non-string color", () => {
    expect(mapActivityKindRow({ color: 123 }).color).toBeNull();
    expect(mapActivityKindRow({ color: null }).color).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapActivityLogRow
// ---------------------------------------------------------------------------

describe("mapActivityLogRow", () => {
  it("maps complete SQL row to ActivityLogWithSync", () => {
    const row = {
      id: "log1",
      activity_id: "a1",
      activity_kind_id: "k1",
      quantity: 42,
      memo: "morning run",
      date: "2025-03-01",
      time: "08:00",
      created_at: "2025-03-01T08:00:00Z",
      updated_at: "2025-03-01T08:00:00Z",
      deleted_at: null,
      sync_status: "pending",
    };
    const result = mapActivityLogRow(row);
    expect(result).toEqual({
      id: "log1",
      activityId: "a1",
      activityKindId: "k1",
      quantity: 42,
      memo: "morning run",
      date: "2025-03-01",
      time: "08:00",
      createdAt: "2025-03-01T08:00:00Z",
      updatedAt: "2025-03-01T08:00:00Z",
      deletedAt: null,
      _syncStatus: "pending",
    });
  });

  it("handles null/undefined values with defaults", () => {
    const result = mapActivityLogRow({});
    expect(result.id).toBe("");
    expect(result.activityId).toBe("");
    expect(result.activityKindId).toBeNull();
    expect(result.quantity).toBeNull();
    expect(result.memo).toBe("");
    expect(result.date).toBe("");
    expect(result.time).toBeNull();
    expect(result._syncStatus).toBe("synced");
  });

  describe("numOrNull coercion for quantity", () => {
    it("passes through number values", () => {
      expect(mapActivityLogRow({ quantity: 0 }).quantity).toBe(0);
      expect(mapActivityLogRow({ quantity: 3.14 }).quantity).toBe(3.14);
      expect(mapActivityLogRow({ quantity: -5 }).quantity).toBe(-5);
    });

    it("parses numeric strings", () => {
      expect(mapActivityLogRow({ quantity: "42" }).quantity).toBe(42);
      expect(mapActivityLogRow({ quantity: "3.14" }).quantity).toBe(3.14);
    });

    it("returns null for non-numeric strings", () => {
      expect(mapActivityLogRow({ quantity: "abc" }).quantity).toBeNull();
      expect(mapActivityLogRow({ quantity: "" }).quantity).toBe(0); // Number("") === 0
    });

    it("returns null for null/undefined", () => {
      expect(mapActivityLogRow({ quantity: null }).quantity).toBeNull();
      expect(mapActivityLogRow({ quantity: undefined }).quantity).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// mapGoalRow
// ---------------------------------------------------------------------------

describe("mapGoalRow", () => {
  it("maps complete SQL row to GoalWithSync", () => {
    const row = {
      id: "g1",
      user_id: "u1",
      activity_id: "a1",
      daily_target_quantity: 5,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      is_active: 1,
      description: "daily goal",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
      deleted_at: null,
      sync_status: "synced",
    };
    const result = mapGoalRow(row);
    expect(result).toEqual({
      id: "g1",
      userId: "u1",
      activityId: "a1",
      dailyTargetQuantity: 5,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      isActive: true,
      description: "daily goal",
      debtCap: null,
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-02T00:00:00Z",
      deletedAt: null,
      _syncStatus: "synced",
    });
  });

  it("handles null/undefined values with defaults", () => {
    const result = mapGoalRow({});
    expect(result.id).toBe("");
    expect(result.userId).toBe("");
    expect(result.activityId).toBe("");
    expect(result.dailyTargetQuantity).toBe(0);
    expect(result.startDate).toBe("");
    expect(result.endDate).toBeNull();
    expect(result.isActive).toBe(false);
    expect(result.description).toBe("");
    expect(result._syncStatus).toBe("synced");
  });

  it("always returns 0 for computed fields", () => {
    const row = {
      id: "g1",
      current_balance: 100,
      total_target: 200,
      total_actual: 150,
    };
    const result = mapGoalRow(row);
    expect(result.currentBalance).toBe(0);
    expect(result.totalTarget).toBe(0);
    expect(result.totalActual).toBe(0);
  });

  describe("num() coercion for dailyTargetQuantity", () => {
    it("passes through number values", () => {
      expect(mapGoalRow({ daily_target_quantity: 5 }).dailyTargetQuantity).toBe(
        5,
      );
      expect(mapGoalRow({ daily_target_quantity: 0 }).dailyTargetQuantity).toBe(
        0,
      );
    });

    it("parses numeric strings", () => {
      expect(
        mapGoalRow({ daily_target_quantity: "10" }).dailyTargetQuantity,
      ).toBe(10);
    });

    it("falls back to default (0) for non-numeric strings", () => {
      expect(
        mapGoalRow({ daily_target_quantity: "abc" }).dailyTargetQuantity,
      ).toBe(0);
    });
  });

  describe("is_active coercion", () => {
    it("treats 1 as true", () => {
      expect(mapGoalRow({ is_active: 1 }).isActive).toBe(true);
    });

    it("treats 0 as false", () => {
      expect(mapGoalRow({ is_active: 0 }).isActive).toBe(false);
    });

    it("treats other values as false (strict === 1)", () => {
      expect(mapGoalRow({ is_active: true }).isActive).toBe(false);
      expect(mapGoalRow({ is_active: "1" }).isActive).toBe(false);
      expect(mapGoalRow({ is_active: null }).isActive).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// mapTaskRow
// ---------------------------------------------------------------------------

describe("mapTaskRow", () => {
  it("maps complete SQL row to TaskWithSync", () => {
    const row = {
      id: "t1",
      user_id: "u1",
      title: "Buy groceries",
      start_date: "2025-03-01",
      due_date: "2025-03-05",
      done_date: "2025-03-04",
      memo: "eggs, milk",
      archived_at: "2025-03-06T00:00:00Z",
      created_at: "2025-03-01T00:00:00Z",
      updated_at: "2025-03-04T00:00:00Z",
      deleted_at: null,
      sync_status: "failed",
    };
    const result = mapTaskRow(row);
    expect(result).toEqual({
      id: "t1",
      userId: "u1",
      title: "Buy groceries",
      startDate: "2025-03-01",
      dueDate: "2025-03-05",
      doneDate: "2025-03-04",
      memo: "eggs, milk",
      archivedAt: "2025-03-06T00:00:00Z",
      createdAt: "2025-03-01T00:00:00Z",
      updatedAt: "2025-03-04T00:00:00Z",
      deletedAt: null,
      _syncStatus: "failed",
    });
  });

  it("handles null/undefined values with defaults", () => {
    const result = mapTaskRow({});
    expect(result.id).toBe("");
    expect(result.userId).toBe("");
    expect(result.title).toBe("");
    expect(result.startDate).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.doneDate).toBeNull();
    expect(result.memo).toBe("");
    expect(result.archivedAt).toBeNull();
    expect(result.deletedAt).toBeNull();
    expect(result._syncStatus).toBe("synced");
  });

  it("returns null for non-string date fields", () => {
    const row = {
      start_date: 123,
      due_date: true,
      done_date: {},
      archived_at: [],
    };
    const result = mapTaskRow(row);
    expect(result.startDate).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.doneDate).toBeNull();
    expect(result.archivedAt).toBeNull();
  });

  it("preserves string date fields even if not valid dates", () => {
    const row = {
      start_date: "not-a-date",
      due_date: "",
      done_date: "2025-99-99",
    };
    const result = mapTaskRow(row);
    expect(result.startDate).toBe("not-a-date");
    expect(result.dueDate).toBe("");
    expect(result.doneDate).toBe("2025-99-99");
  });
});
