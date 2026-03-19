import type { SyncResult } from "@packages/sync-engine";
import {
  createSyncActivityLogs,
  createSyncEngine,
  createSyncGoalFreezePeriods,
  createSyncGoals,
  createSyncTasks,
} from "@packages/sync-engine";
import { UpsertGoalRequestSchema } from "@packages/types/sync/request/goal";

import { activityLogRepository } from "../repositories/activityLogRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { taskRepository } from "../repositories/taskRepository";
import { apiClient } from "../utils/apiClient";
import { reportError } from "../utils/errorReporter";
import { rnNetworkAdapter } from "./rnPlatformAdapters";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";

const syncActivityLogs = createSyncActivityLogs({
  getPendingSyncActivityLogs: () =>
    activityLogRepository.getPendingSyncActivityLogs(),
  postChunk: async (chunk) => {
    const res = await apiClient.users.v2["activity-logs"].sync.$post({
      json: { logs: chunk },
    });
    if (!res.ok) throw new Error(`syncActivityLogs failed: ${res.status}`);
    return (await res.json()) as SyncResult;
  },
  markActivityLogsSynced: (ids) =>
    activityLogRepository.markActivityLogsSynced(ids),
  markActivityLogsFailed: (ids) =>
    activityLogRepository.markActivityLogsFailed(ids),
  upsertActivityLogsFromServer: (wins) =>
    activityLogRepository.upsertActivityLogsFromServer(wins),
});

const syncGoals = createSyncGoals({
  getPendingSyncGoals: () => goalRepository.getPendingSyncGoals(),
  postChunk: async (chunk) => {
    const goals = UpsertGoalRequestSchema.array().parse(chunk);
    const res = await apiClient.users.v2.goals.sync.$post({
      json: { goals },
    });
    if (!res.ok) throw new Error(`syncGoals failed: ${res.status}`);
    return (await res.json()) as SyncResult;
  },
  markGoalsSynced: (ids) => goalRepository.markGoalsSynced(ids),
  markGoalsFailed: (ids) => goalRepository.markGoalsFailed(ids),
  upsertGoalsFromServer: (wins) => goalRepository.upsertGoalsFromServer(wins),
});

const syncTasks = createSyncTasks({
  getPendingSyncTasks: () => taskRepository.getPendingSyncTasks(),
  postChunk: async (chunk) => {
    const res = await apiClient.users.v2.tasks.sync.$post({
      json: { tasks: chunk },
    });
    if (!res.ok) throw new Error(`syncTasks failed: ${res.status}`);
    return (await res.json()) as SyncResult;
  },
  markTasksSynced: (ids) => taskRepository.markTasksSynced(ids),
  markTasksFailed: (ids) => taskRepository.markTasksFailed(ids),
  upsertTasksFromServer: (wins) => taskRepository.upsertTasksFromServer(wins),
});

const syncGoalFreezePeriods = createSyncGoalFreezePeriods({
  getPendingSyncFreezePeriods: () =>
    goalFreezePeriodRepository.getPendingSyncFreezePeriods(),
  postChunk: async (chunk) => {
    const res = await apiClient.users.v2["goal-freeze-periods"].sync.$post({
      json: { freezePeriods: chunk },
    });
    if (!res.ok) throw new Error(`syncGoalFreezePeriods failed: ${res.status}`);
    return (await res.json()) as SyncResult;
  },
  markFreezePeriodsSynced: (ids) =>
    goalFreezePeriodRepository.markFreezePeriodsSynced(ids),
  markFreezePeriodsFailed: (ids) =>
    goalFreezePeriodRepository.markFreezePeriodsFailed(ids),
  upsertFreezePeriodsFromServer: (wins) =>
    goalFreezePeriodRepository.upsertFreezePeriodsFromServer(wins),
});

export const syncEngine = createSyncEngine(
  {
    syncActivityIconDeletions,
    syncActivities,
    syncActivityIcons,
    syncActivityLogs,
    syncGoals,
    syncGoalFreezePeriods,
    syncTasks,
  },
  rnNetworkAdapter,
  (error, phase) => {
    console.error(`[sync] ${phase} failed:`, error);
    reportError({
      errorType: "unhandled_error",
      message: `Push sync failed (${phase}): ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  },
);
