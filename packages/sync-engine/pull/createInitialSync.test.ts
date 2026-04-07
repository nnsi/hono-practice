import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetServerTimeForTests } from "../core/serverTime";
import { createInitialSync } from "./createInitialSync";

function createStorage(initial: Record<string, string> = {}): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function okResponse(
  data: unknown,
  dateHeader = "Tue, 31 Mar 2026 03:00:02 GMT",
) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers({ date: dateHeader }),
  };
}

function createDeps(
  overrides: Partial<Parameters<typeof createInitialSync>[0]> = {},
) {
  return {
    clearAllTables: vi.fn().mockResolvedValue(undefined),
    updateAuthState: vi.fn().mockResolvedValue(undefined),
    isLocalDataEmpty: vi.fn().mockResolvedValue(false),
    fetchAllApis: vi.fn().mockResolvedValue({
      activitiesRes: okResponse({ activities: [], activityKinds: [] }),
      logsRes: okResponse({ logs: [] }),
      goalsRes: okResponse({ goals: [] }),
      freezePeriodsRes: okResponse({ freezePeriods: [] }),
      tasksRes: okResponse({ tasks: [] }),
      notesRes: okResponse({ notes: [] }),
    }),
    writeAllData: vi.fn().mockResolvedValue(undefined),
    deltaResources: [
      "logs",
      "goals",
      "freezePeriods",
      "tasks",
      "notes",
    ] as const,
    legacyBootstrappedResources: [
      "logs",
      "goals",
      "freezePeriods",
      "tasks",
    ] as const,
    defaultStorage: createStorage(),
    ...overrides,
  };
}

describe("createInitialSync bootstrap resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerTimeForTests();
  });

  it("clears both sync watermark and bootstrap resources", async () => {
    const storage = createStorage({
      "actiko-v2-lastSyncedAt": "2026-03-01T00:00:00.000Z",
      "actiko-v2-bootstrappedResources": JSON.stringify(["logs", "notes"]),
    });
    const deps = createDeps({ defaultStorage: storage });
    const { clearLocalData } = createInitialSync(deps);

    await clearLocalData();

    expect(storage.getItem("actiko-v2-lastSyncedAt")).toBeNull();
    expect(storage.getItem("actiko-v2-bootstrappedResources")).toBeNull();
  });

  it("uses legacy bootstrap resources for delta sync and full-pulls notes once", async () => {
    const lastSyncedAt = "2026-03-01T00:00:00.000Z";
    const storage = createStorage({
      "actiko-v2-lastSyncedAt": lastSyncedAt,
    });
    const deps = createDeps({ defaultStorage: storage });
    const { performInitialSync } = createInitialSync(deps);

    await performInitialSync("user-1");

    expect(deps.fetchAllApis).toHaveBeenCalledWith({
      logs: lastSyncedAt,
      goals: lastSyncedAt,
      freezePeriods: lastSyncedAt,
      tasks: lastSyncedAt,
    });
    expect(
      JSON.parse(storage.getItem("actiko-v2-bootstrappedResources") ?? "[]"),
    ).toEqual(["logs", "goals", "freezePeriods", "tasks", "notes"]);
  });

  it("second sync uses delta for all resources including notes", async () => {
    const storage = createStorage({
      "actiko-v2-lastSyncedAt": "2026-03-01T00:00:00.000Z",
    });
    const deps = createDeps({ defaultStorage: storage });
    const { performInitialSync } = createInitialSync(deps);

    // 1回目: notes はフルpull
    await performInitialSync("user-1");

    // lastSyncedAt が更新される
    const newWatermark = storage.getItem("actiko-v2-lastSyncedAt");
    expect(newWatermark).not.toBeNull();

    // 2回目: notes も delta sync
    await performInitialSync("user-1");

    expect(deps.fetchAllApis).toHaveBeenLastCalledWith({
      logs: newWatermark,
      goals: newWatermark,
      freezePeriods: newWatermark,
      tasks: newWatermark,
      notes: newWatermark,
    });
  });

  it("resets bootstrappedResources when DB is empty", async () => {
    const storage = createStorage({
      "actiko-v2-lastSyncedAt": "2026-03-01T00:00:00.000Z",
      "actiko-v2-bootstrappedResources": JSON.stringify([
        "logs",
        "goals",
        "freezePeriods",
        "tasks",
        "notes",
      ]),
    });
    const deps = createDeps({
      defaultStorage: storage,
      isLocalDataEmpty: vi.fn().mockResolvedValue(true),
    });
    const { performInitialSync } = createInitialSync(deps);

    await performInitialSync("user-1");

    // DB空 → watermarkもbootstrappedResourcesもリセット → 全リソースフルpull
    expect(deps.fetchAllApis).toHaveBeenCalledWith({});
  });

  it("full-pulls only new resource when stored bootstrappedResources lacks it", async () => {
    // 既存の stored state に "notes" がない状態（新リソース追加を模倣）
    const lastSyncedAt = "2026-04-01T00:00:00.000Z";
    const storage = createStorage({
      "actiko-v2-lastSyncedAt": lastSyncedAt,
      "actiko-v2-bootstrappedResources": JSON.stringify([
        "logs",
        "goals",
        "freezePeriods",
        "tasks",
      ]),
    });
    const deps = createDeps({ defaultStorage: storage });
    const { performInitialSync } = createInitialSync(deps);

    await performInitialSync("user-1");

    // notes だけ since なし、他は delta
    expect(deps.fetchAllApis).toHaveBeenCalledWith({
      logs: lastSyncedAt,
      goals: lastSyncedAt,
      freezePeriods: lastSyncedAt,
      tasks: lastSyncedAt,
    });

    // sync 成功後、notes も bootstrapped に追加
    const stored = JSON.parse(
      storage.getItem("actiko-v2-bootstrappedResources") ?? "[]",
    );
    expect(stored).toContain("notes");
  });
});
