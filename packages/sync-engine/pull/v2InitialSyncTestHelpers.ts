import { vi } from "vitest";

import type { createV2InitialSync } from "./createV2InitialSync";

export const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";
export const BOOTSTRAPPED_KEY = "actiko-v2-bootstrappedResources";

export function createStorage(initial: Record<string, string> = {}) {
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

export function okResponse(data: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers({ date: "Tue, 31 Mar 2026 03:00:02 GMT" }),
  };
}

export function createMockApi() {
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
    getTaskSchedules: vi
      .fn()
      .mockResolvedValue(okResponse({ taskSchedules: [] })),
    getTasks: vi.fn().mockResolvedValue(okResponse({ tasks: [] })),
    getNotes: vi.fn().mockResolvedValue(okResponse({ notes: [] })),
  };
}

export function createMockRepos() {
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
    taskSchedule: {
      upsertTaskSchedulesFromServer: vi.fn().mockResolvedValue(undefined),
    },
    task: { upsertTasksFromServer: vi.fn().mockResolvedValue(undefined) },
    note: { upsertNotesFromServer: vi.fn().mockResolvedValue(undefined) },
  };
}

export function createDeps(
  overrides: Partial<
    Omit<Parameters<typeof createV2InitialSync>[0], "api" | "repos">
  > = {},
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
