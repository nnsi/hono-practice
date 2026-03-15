import { UpsertGoalRequestSchema } from "@dtos/sync/request/goal";
import type { SyncResult } from "@packages/sync-engine";
import {
  createSyncActivityLogs,
  createSyncEngine,
  createSyncGoalFreezePeriods,
  createSyncGoals,
  createSyncTasks,
} from "@packages/sync-engine";

import { activityLogRepository } from "../db/activityLogRepository";
import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { goalRepository } from "../db/goalRepository";
import { taskRepository } from "../db/taskRepository";
import { apiClient, customFetch } from "../utils/apiClient";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";
import { webNetworkAdapter } from "./webPlatformAdapters";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

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
    const res = await customFetch(
      `${API_URL}/users/v2/goal-freeze-periods/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freezePeriods: chunk }),
      },
    );
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
  webNetworkAdapter,
);
