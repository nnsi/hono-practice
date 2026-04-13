import { describe, expect, it, vi } from "vitest";

import { importValidatedLogs } from "./csvImportExecutor";
import type { ValidatedActivityLog } from "./csvImportUtils";

function createLog(
  overrides: Partial<ValidatedActivityLog> = {},
): ValidatedActivityLog {
  return {
    date: "2026-04-13",
    activityName: "Run",
    activityId: "activity-1",
    kindName: undefined,
    quantity: 3,
    memo: "",
    isNewActivity: false,
    errors: [],
    ...overrides,
  };
}

function createDependencies() {
  return {
    activityRepository: {
      getAllActivities: vi
        .fn()
        .mockResolvedValue([{ id: "activity-1", name: "Run" }]),
      getAllActivityKinds: vi.fn().mockResolvedValue([]),
      createActivity: vi.fn(),
    },
    activityLogRepository: {
      createActivityLog: vi.fn().mockResolvedValue(undefined),
      getActivityLogsBetween: vi.fn().mockResolvedValue([]),
    },
    syncEngine: {
      syncAll: vi.fn(),
    },
  };
}

describe("importValidatedLogs", () => {
  it("returns noImportData when there is nothing importable", async () => {
    const deps = createDependencies();
    const onProgress = vi.fn();

    const result = await importValidatedLogs({
      logs: [createLog({ errors: [{ field: "date", message: "invalid" }] })],
      t: (key) => `:${key}`,
      onProgress,
      ...deps,
    });

    expect(result).toEqual({
      importSuccess: false,
      errorMessage: ":noImportData",
      autoCloseDelayMs: null,
    });
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("reports skipped duplicates, succeeds partially, and updates progress", async () => {
    const deps = createDependencies();
    deps.activityLogRepository.getActivityLogsBetween.mockResolvedValue([
      {
        date: "2026-04-13",
        activityId: "activity-1",
        quantity: 3,
        memo: "",
      },
    ]);
    const progressUpdates: Array<{
      total: number;
      processed: number;
      succeeded: number;
      skipped: number;
      failed: number;
    }> = [];

    const result = await importValidatedLogs({
      logs: [createLog(), createLog({ date: "2026-04-12", quantity: 4 })],
      t: (key) => `:${key}`,
      onProgress: (progress) => progressUpdates.push(progress),
      ...deps,
    });

    expect(result).toEqual({
      importSuccess: true,
      errorMessage: "1:skipDuplicate",
      autoCloseDelayMs: 2500,
    });
    expect(progressUpdates).toEqual([
      { total: 2, processed: 0, succeeded: 0, skipped: 0, failed: 0 },
      { total: 2, processed: 1, succeeded: 0, skipped: 1, failed: 0 },
      { total: 2, processed: 2, succeeded: 1, skipped: 1, failed: 0 },
    ]);
    expect(deps.activityLogRepository.createActivityLog).toHaveBeenCalledTimes(
      1,
    );
    expect(deps.syncEngine.syncAll).toHaveBeenCalledTimes(1);
  });

  it("returns failure summary when some records fail", async () => {
    const deps = createDependencies();

    const result = await importValidatedLogs({
      logs: [
        createLog({ activityId: undefined, activityName: "Unknown activity" }),
        createLog({ date: "2026-04-12", quantity: 4 }),
      ],
      t: (key) => `:${key}`,
      onProgress: vi.fn(),
      ...deps,
    });

    expect(result).toEqual({
      importSuccess: false,
      errorMessage: "1:importFailed",
      autoCloseDelayMs: null,
    });
    expect(deps.activityLogRepository.createActivityLog).toHaveBeenCalledTimes(
      1,
    );
  });

  it("returns importError when dependency calls throw", async () => {
    const deps = createDependencies();
    deps.activityRepository.getAllActivities.mockRejectedValue(
      new Error("boom"),
    );

    const result = await importValidatedLogs({
      logs: [createLog()],
      t: (key) => `:${key}`,
      onProgress: vi.fn(),
      ...deps,
    });

    expect(result).toEqual({
      importSuccess: false,
      errorMessage: ":importError",
      autoCloseDelayMs: null,
    });
    expect(deps.syncEngine.syncAll).not.toHaveBeenCalled();
  });
});
