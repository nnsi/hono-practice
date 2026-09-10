import { vi } from "vitest";

export const okSyncResult = (over: Partial<Record<string, unknown>> = {}) => ({
  ok: true,
  status: 200,
  json: () =>
    Promise.resolve({ syncedIds: [], skippedIds: [], serverWins: [], ...over }),
});

export function createMockApi() {
  return {
    postActivityLogs: vi.fn().mockResolvedValue(okSyncResult()),
    postGoals: vi.fn().mockResolvedValue(okSyncResult()),
    postTaskSchedules: vi.fn().mockResolvedValue(okSyncResult()),
    postTasks: vi.fn().mockResolvedValue(okSyncResult()),
    postNotes: vi.fn().mockResolvedValue(okSyncResult()),
    postGoalFreezePeriods: vi.fn().mockResolvedValue(okSyncResult()),
  };
}

export function createMockRepos() {
  return {
    activityLog: {
      getPendingSyncActivityLogs: vi.fn().mockResolvedValue([]),
      markActivityLogsSynced: vi.fn().mockResolvedValue(undefined),
      markActivityLogsFailed: vi.fn().mockResolvedValue(undefined),
      upsertActivityLogsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    goal: {
      getPendingSyncGoals: vi.fn().mockResolvedValue([]),
      markGoalsSynced: vi.fn().mockResolvedValue(undefined),
      markGoalsFailed: vi.fn().mockResolvedValue(undefined),
      upsertGoalsFromServer: vi.fn().mockResolvedValue(undefined),
    },
    taskSchedule: {
      getPendingSyncTaskSchedules: vi.fn().mockResolvedValue([]),
      markTaskSchedulesSynced: vi.fn().mockResolvedValue(undefined),
      markTaskSchedulesFailed: vi.fn().mockResolvedValue(undefined),
      upsertTaskSchedulesFromServer: vi.fn().mockResolvedValue(undefined),
    },
    task: {
      getPendingSyncTasks: vi.fn().mockResolvedValue([]),
      markTasksSynced: vi.fn().mockResolvedValue(undefined),
      markTasksFailed: vi.fn().mockResolvedValue(undefined),
      upsertTasksFromServer: vi.fn().mockResolvedValue(undefined),
    },
    note: {
      getPendingSyncNotes: vi.fn().mockResolvedValue([]),
      markNotesSynced: vi.fn().mockResolvedValue(undefined),
      markNotesFailed: vi.fn().mockResolvedValue(undefined),
      upsertNotesFromServer: vi.fn().mockResolvedValue(undefined),
    },
    goalFreezePeriod: {
      getPendingSyncFreezePeriods: vi.fn().mockResolvedValue([]),
      markFreezePeriodsSynced: vi.fn().mockResolvedValue(undefined),
      markFreezePeriodsFailed: vi.fn().mockResolvedValue(undefined),
      upsertFreezePeriodsFromServer: vi.fn().mockResolvedValue(undefined),
    },
  };
}

export const pendingGoal = {
  id: "9f3c8bb0-0000-4000-8000-000000000001",
  activityId: "9f3c8bb0-0000-4000-8000-000000000002",
  dailyTargetQuantity: 10,
  startDate: "2025-01-01",
  endDate: null,
  isActive: true,
  description: "",
  debtCap: null,
  dayTargets: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "pending",
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
};
