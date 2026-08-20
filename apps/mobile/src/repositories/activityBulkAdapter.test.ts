import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("../db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("../db/dbEvents", () => ({ dbEvents: { emit: mocks.emit } }));
vi.mock("../lib/widgetTimeline", () => ({ reloadWidgetTimelines: vi.fn() }));

import { activityBulkAdapterMethods } from "./activityBulkAdapter";

describe("activityBulkAdapter revision guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves an Activity edited after its sync snapshot was sent", async () => {
    const row = {
      id: "a1",
      updatedAt: "2026-01-01T00:00:01.000Z",
      syncStatus: "pending",
    };
    const runAsync = vi.fn(
      async (_sql: string, params: (string | number | null)[]) => {
        const [status, id, expectedUpdatedAt] = params;
        if (id === row.id && expectedUpdatedAt === row.updatedAt) {
          row.syncStatus = String(status);
        }
      },
    );
    const db = {
      runAsync,
      withTransactionAsync: async (operation: () => Promise<void>) =>
        operation(),
    };
    mocks.getDatabase.mockResolvedValue(db);

    await activityBulkAdapterMethods.updateActivitiesSyncStatus(
      [{ id: "a1", updatedAt: "2026-01-01T00:00:00.000Z" }],
      "synced",
    );

    expect(runAsync).toHaveBeenCalledWith(
      "UPDATE activities SET sync_status = ? WHERE id = ? AND updated_at = ?",
      ["synced", "a1", "2026-01-01T00:00:00.000Z"],
    );
    expect(row.syncStatus).toBe("pending");
  });

  it("updates the status when the Activity revision still matches", async () => {
    const row = {
      id: "a1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      syncStatus: "pending",
    };
    const runAsync = vi.fn(
      async (_sql: string, params: (string | number | null)[]) => {
        const [status, id, expectedUpdatedAt] = params;
        if (id === row.id && expectedUpdatedAt === row.updatedAt) {
          row.syncStatus = String(status);
        }
      },
    );
    mocks.getDatabase.mockResolvedValue({
      runAsync,
      withTransactionAsync: async (operation: () => Promise<void>) =>
        operation(),
    });

    await activityBulkAdapterMethods.updateActivitiesSyncStatus(
      [{ id: "a1", updatedAt: row.updatedAt }],
      "synced",
    );

    expect(row.syncStatus).toBe("synced");
  });
});
