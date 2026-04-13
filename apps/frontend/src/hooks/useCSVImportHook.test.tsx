import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DexieActivity, DexieActivityKind } from "../db/schema";

const mocks = vi.hoisted(() => ({
  activityRepository: {
    getAllActivities: vi.fn(),
    getAllActivityKinds: vi.fn(),
    createActivity: vi.fn(),
  },
  activityLogRepository: {
    createActivityLog: vi.fn(),
    getActivityLogsBetween: vi.fn(),
  },
  syncEngine: {
    syncAll: vi.fn(),
  },
  parseCSVFile: vi.fn(),
}));

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../db/activityRepository", () => ({
  activityRepository: mocks.activityRepository,
}));

vi.mock("../db/activityLogRepository", () => ({
  activityLogRepository: mocks.activityLogRepository,
}));

vi.mock("../sync/syncEngine", () => ({
  syncEngine: mocks.syncEngine,
}));

vi.mock("./csvImportUtils", async () => {
  const actual =
    await vi.importActual<typeof import("./csvImportUtils")>(
      "./csvImportUtils",
    );

  return {
    ...actual,
    parseCSVFile: mocks.parseCSVFile,
  };
});

import { useCSVImport } from "./useCSVImport";

function createActivity(overrides: Partial<DexieActivity> = {}): DexieActivity {
  return {
    id: "activity-1",
    userId: "user-1",
    name: "Run",
    label: "Run",
    emoji: "🏃",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "km",
    orderIndex: "a0",
    showCombinedStats: true,
    recordingMode: "manual",
    recordingModeConfig: null,
    createdAt: "2026-04-13T00:00:00.000Z",
    updatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

function createActivityKind(
  overrides: Partial<DexieActivityKind> = {},
): DexieActivityKind {
  return {
    id: "kind-1",
    activityId: "activity-1",
    name: "Jog",
    color: null,
    orderIndex: "a0",
    createdAt: "2026-04-13T00:00:00.000Z",
    updatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

function createDeferredPromise<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("useCSVImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activityRepository.getAllActivities.mockResolvedValue([
      createActivity(),
    ]);
    mocks.activityRepository.getAllActivityKinds.mockResolvedValue([
      createActivityKind(),
    ]);
    mocks.activityRepository.createActivity.mockResolvedValue(
      createActivity({ id: "activity-2", name: "Swim" }),
    );
    mocks.activityLogRepository.getActivityLogsBetween.mockResolvedValue([]);
    mocks.activityLogRepository.createActivityLog.mockResolvedValue({
      id: "log-1",
    });
    mocks.parseCSVFile.mockResolvedValue({
      headers: ["date", "activity", "kind", "quantity", "memo"],
      data: [
        {
          date: "2024-01-02",
          activity: "Run",
          kind: "Jog",
          quantity: "3",
          memo: "morning run",
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses csv, builds preview, edits rows, and removes rows", async () => {
    const { result } = renderHook(() => useCSVImport(vi.fn()));
    const file = new File(
      ["date,activity,kind,quantity,memo\n2024-01-02,Run,Jog,3,morning run"],
      "activity-log.csv",
      { type: "text/csv" },
    );

    act(() => {
      result.current.handleFileSelect(file);
    });

    await act(async () => {
      await result.current.handleParse();
    });

    expect(result.current.step).toBe("mapping");
    expect(result.current.csvHeaders).toEqual([
      "date",
      "activity",
      "kind",
      "quantity",
      "memo",
    ]);
    expect(result.current.columnMapping).toEqual({
      date: "date",
      activity: "activity",
      kind: "kind",
      quantity: "quantity",
      memo: "memo",
    });

    await act(async () => {
      await result.current.handleMappingConfirm();
    });

    expect(result.current.step).toBe("preview");
    expect(result.current.validatedLogs).toHaveLength(1);
    expect(result.current.validatedLogs[0]).toMatchObject({
      activityId: "activity-1",
      activityName: "Run",
      kindName: "Jog",
      quantity: 3,
      memo: "morning run",
      isNewActivity: false,
    });
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.handleEdit(0, "activityName", "Swim");
    });

    expect(result.current.validatedLogs[0]).toMatchObject({
      activityName: "Swim",
      activityId: undefined,
      kindName: undefined,
      isNewActivity: true,
    });

    act(() => {
      result.current.handleRemove([0]);
    });

    expect(result.current.validatedLogs).toEqual([]);
  });

  it("tracks import progress, toggles importing state, and auto-resets after completion", async () => {
    vi.useFakeTimers();

    const createActivityLog = createDeferredPromise<{ id: string }>();
    mocks.activityLogRepository.createActivityLog.mockReturnValue(
      createActivityLog.promise,
    );

    const onComplete = vi.fn();
    const { result } = renderHook(() => useCSVImport(onComplete));
    const logs = [
      {
        date: "2024-01-02",
        activityName: "Run",
        activityId: "activity-1",
        kindName: "Jog",
        quantity: 3,
        memo: "morning run",
        isNewActivity: false,
        errors: [],
      },
    ];

    let importPromise!: Promise<void>;
    await act(async () => {
      importPromise = result.current.handleImport(logs);
      await Promise.resolve();
    });

    expect(result.current.isImporting).toBe(true);
    expect(result.current.progress).toEqual({
      total: 1,
      processed: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
    });

    createActivityLog.resolve({ id: "log-1" });

    await act(async () => {
      await importPromise;
    });

    expect(result.current.isImporting).toBe(false);
    expect(result.current.importSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toEqual({
      total: 1,
      processed: 1,
      succeeded: 1,
      skipped: 0,
      failed: 0,
    });
    expect(
      mocks.activityLogRepository.getActivityLogsBetween,
    ).toHaveBeenCalledWith("2024-01-02", "2024-01-02");
    expect(mocks.activityLogRepository.createActivityLog).toHaveBeenCalledWith({
      activityId: "activity-1",
      activityKindId: "kind-1",
      quantity: 3,
      memo: "morning run",
      date: "2024-01-02",
      time: null,
      taskId: null,
    });
    expect(mocks.syncEngine.syncAll).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("file");
    expect(result.current.file).toBeNull();
    expect(result.current.importSuccess).toBe(false);
    expect(result.current.progress).toEqual({
      total: 0,
      processed: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it("downloads the template and reset clears intermediate state", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => "blob:test-url");
    const revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    try {
      const { result } = renderHook(() => useCSVImport(vi.fn()));
      const file = new File(
        ["date,activity,quantity\n2024-01-02,Run,3"],
        "activity-log.csv",
        { type: "text/csv" },
      );

      act(() => {
        result.current.handleFileSelect(file);
      });

      await act(async () => {
        await result.current.handleParse();
      });

      expect(result.current.step).toBe("mapping");
      expect(result.current.file).toBe(file);

      act(() => {
        result.current.downloadTemplate();
      });

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-url");

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe("file");
      expect(result.current.file).toBeNull();
      expect(result.current.csvHeaders).toEqual([]);
      expect(result.current.parsedData).toEqual([]);
      expect(result.current.validatedLogs).toEqual([]);
      expect(result.current.error).toBeNull();
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  });
});
