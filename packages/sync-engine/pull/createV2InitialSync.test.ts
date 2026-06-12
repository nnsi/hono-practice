import { beforeEach, describe, expect, it, vi } from "vitest";

import { createV2InitialSync } from "./createV2InitialSync";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";
const BOOTSTRAPPED_KEY = "actiko-v2-bootstrappedResources";

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

function okResponse(data: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers({ date: "Tue, 31 Mar 2026 03:00:02 GMT" }),
  };
}

function createMockApi() {
  return {
    getActivities: vi
      .fn()
      .mockResolvedValue(
        okResponse({ activities: [{ id: "a1" }], activityKinds: [] }),
      ),
    getActivityLogs: vi
      .fn()
      .mockResolvedValue(okResponse({ logs: [{ id: "l1" }] })),
    getGoals: vi.fn().mockResolvedValue(okResponse({ goals: [] })),
    getGoalFreezePeriods: vi
      .fn()
      .mockResolvedValue(okResponse({ freezePeriods: [] })),
    getTasks: vi.fn().mockResolvedValue(okResponse({ tasks: [] })),
    getNotes: vi.fn().mockResolvedValue(okResponse({ notes: [] })),
  };
}

function createMockRepos() {
  return {
    activity: {
      upsertActivities: vi.fn().mockResolvedValue(undefined),
      upsertActivityKinds: vi.fn().mockResolvedValue(undefined),
    },
    activityLog: {
      upsertActivityLogsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    goal: { upsertGoalsFromServer: vi.fn().mockResolvedValue(undefined) },
    goalFreezePeriod: {
      upsertFreezePeriodsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    task: { upsertTasksFromServer: vi.fn().mockResolvedValue(undefined) },
    note: { upsertNotesFromServer: vi.fn().mockResolvedValue(undefined) },
  };
}

function createDeps(
  overrides: Partial<Parameters<typeof createV2InitialSync>[0]> = {},
) {
  return {
    api: createMockApi(),
    repos: createMockRepos(),
    getClientDate: () => "2026-03-31",
    clearAllTables: vi.fn().mockResolvedValue(undefined),
    updateAuthState: vi.fn().mockResolvedValue(undefined),
    isLocalDataEmpty: vi.fn().mockResolvedValue(false),
    defaultStorage: createStorage(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("createV2InitialSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs a full pull without since params on first sync", async () => {
    const deps = createDeps();
    const { performInitialSync } = createV2InitialSync(deps);

    await performInitialSync("user-1");

    expect(deps.api.getActivities).toHaveBeenCalledWith();
    expect(deps.api.getActivityLogs).toHaveBeenCalledWith({});
    expect(deps.api.getGoals).toHaveBeenCalledWith({
      clientDate: "2026-03-31",
    });
    expect(deps.api.getGoalFreezePeriods).toHaveBeenCalledWith({});
    expect(deps.api.getTasks).toHaveBeenCalledWith({});
    expect(deps.api.getNotes).toHaveBeenCalledWith({});
  });

  it("passes since for bootstrapped delta resources on subsequent syncs", async () => {
    const since = "2026-03-01T00:00:00.000Z";
    const deps = createDeps({
      defaultStorage: createStorage({
        [LAST_SYNCED_KEY]: since,
        [BOOTSTRAPPED_KEY]: JSON.stringify([
          "logs",
          "goals",
          "freezePeriods",
          "tasks",
          "notes",
        ]),
      }),
    });
    const { performInitialSync } = createV2InitialSync(deps);

    await performInitialSync("user-1");

    expect(deps.api.getActivityLogs).toHaveBeenCalledWith({ since });
    expect(deps.api.getGoals).toHaveBeenCalledWith({
      since,
      clientDate: "2026-03-31",
    });
    expect(deps.api.getGoalFreezePeriods).toHaveBeenCalledWith({ since });
    expect(deps.api.getTasks).toHaveBeenCalledWith({ since });
    expect(deps.api.getNotes).toHaveBeenCalledWith({ since });
  });

  it("writes pulled data through the repositories", async () => {
    const deps = createDeps();
    const { performInitialSync } = createV2InitialSync(deps);

    await performInitialSync("user-1");

    expect(deps.repos.activity.upsertActivities).toHaveBeenCalledWith([
      expect.objectContaining({ id: "a1" }),
    ]);
    expect(
      deps.repos.activityLog.upsertActivityLogsFromServer,
    ).toHaveBeenCalledWith([expect.objectContaining({ id: "l1" })]);
  });

  it("wraps writes in runWriteTransaction when provided", async () => {
    const order: string[] = [];
    const repos = createMockRepos();
    repos.activity.upsertActivities.mockImplementation(async () => {
      order.push("write");
    });
    const runWriteTransaction = vi.fn(async (write: () => Promise<void>) => {
      order.push("tx-start");
      await write();
      order.push("tx-end");
    });
    const deps = createDeps({ repos, runWriteTransaction });
    const { performInitialSync } = createV2InitialSync(deps);

    await performInitialSync("user-1");

    expect(runWriteTransaction).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["tx-start", "write", "tx-end"]);
  });

  // Existing platform behavior (blessed by the Web initialSync tests):
  // a rejected freeze-period / notes fetch falls back to null, other
  // resources still hydrate, and the watermark still advances.
  it("treats freeze period fetch rejection as best-effort", async () => {
    const api = createMockApi();
    api.getGoalFreezePeriods.mockRejectedValue(new Error("rollout"));
    const deps = createDeps({ api });
    const { performInitialSync } = createV2InitialSync(deps);

    await expect(performInitialSync("user-1")).resolves.toBeUndefined();

    expect(deps.repos.activity.upsertActivities).toHaveBeenCalled();
    expect(
      deps.repos.goalFreezePeriod.upsertFreezePeriodsFromServer,
    ).not.toHaveBeenCalled();
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).not.toBeNull();
  });

  it("treats notes fetch rejection as best-effort", async () => {
    const api = createMockApi();
    api.getNotes.mockRejectedValue(new Error("offline"));
    const deps = createDeps({ api });
    const { performInitialSync } = createV2InitialSync(deps);

    await expect(performInitialSync("user-1")).resolves.toBeUndefined();
    expect(deps.repos.note.upsertNotesFromServer).not.toHaveBeenCalled();
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).not.toBeNull();
  });

  it("advances the watermark and bootstraps all resources on full success", async () => {
    const deps = createDeps();
    const { performInitialSync } = createV2InitialSync(deps);

    await performInitialSync("user-1");

    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).not.toBeNull();
    expect(
      JSON.parse(deps.defaultStorage.getItem(BOOTSTRAPPED_KEY) ?? "[]").sort(),
    ).toEqual(["freezePeriods", "goals", "logs", "notes", "tasks"]);
  });

  it("clearLocalData clears tables and sync watermarks", async () => {
    const deps = createDeps({
      defaultStorage: createStorage({
        [LAST_SYNCED_KEY]: "2026-03-01T00:00:00.000Z",
        [BOOTSTRAPPED_KEY]: JSON.stringify(["logs"]),
      }),
    });
    const { clearLocalData } = createV2InitialSync(deps);

    await clearLocalData();

    expect(deps.clearAllTables).toHaveBeenCalledTimes(1);
    expect(deps.defaultStorage.getItem(LAST_SYNCED_KEY)).toBeNull();
    expect(deps.defaultStorage.getItem(BOOTSTRAPPED_KEY)).toBeNull();
  });
});
