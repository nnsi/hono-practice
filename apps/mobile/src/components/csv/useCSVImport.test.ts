import { beforeEach, describe, expect, it, vi } from "vitest";

const { getActivityLogsBetweenMock, createActivityLogMock, syncAllMock } =
  vi.hoisted(() => ({
    getActivityLogsBetweenMock: vi.fn(),
    createActivityLogMock: vi.fn(),
    syncAllMock: vi.fn(),
  }));

vi.mock("../../repositories/activityLogRepository", () => ({
  activityLogRepository: {
    getActivityLogsBetween: getActivityLogsBetweenMock,
    createActivityLog: createActivityLogMock,
  },
}));

vi.mock("../../sync/syncEngine", () => ({
  syncEngine: {
    syncAll: syncAllMock,
  },
}));

vi.mock("@packages/i18n", () => ({
  i18next: {
    t: vi.fn((key: string, options?: { count?: number }) => {
      switch (key) {
        case "activityRequiredForImport":
          return "csv:activityRequiredForImport";
        case "noImportData":
          return "csv:noImportData";
        case "noValidImportData":
          return "csv:noValidImportData";
        case "skipDuplicate":
          return `csv:skipDuplicate:${options?.count ?? 0}`;
        case "importFailed":
          return `csv:importFailed:${options?.count ?? 0}`;
        case "messageSeparator":
          return " | ";
        case "importError":
          return "csv:importError";
        default:
          return `csv:${key}`;
      }
    }),
  },
}));

import { runCSVImport } from "./useCSVImport";

describe("runCSVImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivityLogsBetweenMock.mockResolvedValue([]);
  });

  it("requires an activity before importing", async () => {
    const setError = vi.fn();

    await runCSVImport(
      null,
      [{ date: "2026-04-13", time: "", quantity: "1", memo: "" }],
      [[]],
      vi.fn(),
      setError,
      vi.fn(),
      vi.fn(),
    );

    expect(setError).toHaveBeenCalledWith("csv:activityRequiredForImport");
  });

  it("requires at least one valid row before importing", async () => {
    const setError = vi.fn();

    await runCSVImport(
      "activity-1",
      [{ date: "2026-04-13", time: "", quantity: "1", memo: "" }],
      [["invalid"]],
      vi.fn(),
      setError,
      vi.fn(),
      vi.fn(),
    );

    expect(setError).toHaveBeenCalledWith("csv:noValidImportData");
  });

  it("tracks processed rows and reports skipped and failed rows", async () => {
    const setIsImporting = vi.fn();
    const setError = vi.fn();
    const setProgress = vi.fn();
    const setSuccessCount = vi.fn();
    createActivityLogMock.mockResolvedValueOnce(undefined);
    createActivityLogMock.mockRejectedValueOnce(new Error("create failed"));

    await runCSVImport(
      "activity-1",
      [
        { date: "2026-04-13", time: "08:00", quantity: "1", memo: "ok" },
        { date: "2026-04-13", time: "08:30", quantity: "1", memo: "ok" },
        { date: "2026-04-14", time: "09:00", quantity: "2", memo: "fail" },
      ],
      [[], [], []],
      setIsImporting,
      setError,
      setProgress,
      setSuccessCount,
    );

    expect(setProgress).toHaveBeenNthCalledWith(1, {
      processed: 0,
      total: 3,
      succeeded: 0,
      failed: 0,
    });
    expect(setProgress).toHaveBeenNthCalledWith(2, {
      processed: 1,
      total: 3,
      succeeded: 1,
      failed: 0,
    });
    expect(setProgress).toHaveBeenNthCalledWith(3, {
      processed: 2,
      total: 3,
      succeeded: 1,
      failed: 0,
    });
    expect(setProgress).toHaveBeenNthCalledWith(4, {
      processed: 3,
      total: 3,
      succeeded: 1,
      failed: 1,
    });
    expect(setSuccessCount).toHaveBeenCalledWith(1);
    expect(setError).toHaveBeenLastCalledWith(
      "csv:skipDuplicate:1 | csv:importFailed:1",
    );
    expect(syncAllMock).toHaveBeenCalled();
    expect(setIsImporting).toHaveBeenNthCalledWith(1, true);
    expect(setIsImporting).toHaveBeenLastCalledWith(false);
  });
});
