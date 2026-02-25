import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiClientObj } = vi.hoisted(() => ({
  mockApiClientObj: {} as any,
}));

vi.mock("../db/activityLogRepository");
vi.mock("@packages/domain/sync/apiMappers");
vi.mock("../utils/apiClient", () => ({
  apiClient: mockApiClientObj,
}));

import { activityLogRepository } from "../db/activityLogRepository";
import { mapApiActivityLog } from "@packages/domain/sync/apiMappers";
import { syncActivityLogs } from "./syncActivityLogs";

const mockLogRepo = vi.mocked(activityLogRepository);

describe("syncActivityLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapApiActivityLog).mockImplementation((l: any) => l);
  });

  it("skips when no pending logs", async () => {
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue([]);

    await syncActivityLogs();

    expect(mockLogRepo.markActivityLogsSynced).not.toHaveBeenCalled();
  });

  it("sends logs without _syncStatus field", async () => {
    const pending = [
      {
        id: "l1",
        activityId: "a1",
        quantity: 5,
        date: "2025-01-01",
        _syncStatus: "pending" as const,
      },
    ];
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue(pending as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["l1"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { "activity-logs": { sync: { $post: mockPost } } },
    };

    await syncActivityLogs();

    const sentJson = mockPost.mock.calls[0][0].json;
    expect(sentJson.logs[0]).not.toHaveProperty("_syncStatus");
    expect(sentJson.logs[0]).toEqual({
      id: "l1",
      activityId: "a1",
      quantity: 5,
      date: "2025-01-01",
    });
  });

  it("marks synced on success", async () => {
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["l1"],
          skippedIds: [],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { "activity-logs": { sync: { $post: mockPost } } },
    };

    await syncActivityLogs();

    expect(mockLogRepo.markActivityLogsSynced).toHaveBeenCalledWith(["l1"]);
  });

  it("upserts serverWins", async () => {
    const serverWin = { id: "l2", activityId: "a1", quantity: 10 };
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: [],
          skippedIds: [],
          serverWins: [serverWin],
        }),
    });
    mockApiClientObj.users = {
      v2: { "activity-logs": { sync: { $post: mockPost } } },
    };

    await syncActivityLogs();

    expect(mockLogRepo.upsertActivityLogsFromServer).toHaveBeenCalledWith([
      serverWin,
    ]);
  });

  it("marks failed for skippedIds", async () => {
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
      { id: "l2", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          syncedIds: ["l1"],
          skippedIds: ["l2"],
          serverWins: [],
        }),
    });
    mockApiClientObj.users = {
      v2: { "activity-logs": { sync: { $post: mockPost } } },
    };

    await syncActivityLogs();

    expect(mockLogRepo.markActivityLogsSynced).toHaveBeenCalledWith(["l1"]);
    expect(mockLogRepo.markActivityLogsFailed).toHaveBeenCalledWith(["l2"]);
  });

  it("does not process when API returns not ok", async () => {
    mockLogRepo.getPendingSyncActivityLogs.mockResolvedValue([
      { id: "l1", _syncStatus: "pending" },
    ] as any);

    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    mockApiClientObj.users = {
      v2: { "activity-logs": { sync: { $post: mockPost } } },
    };

    await syncActivityLogs();

    expect(mockLogRepo.markActivityLogsSynced).not.toHaveBeenCalled();
    expect(mockLogRepo.markActivityLogsFailed).not.toHaveBeenCalled();
  });
});
