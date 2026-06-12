import { UpsertGoalRequestSchema } from "@packages/types/sync/request/goal";

import type { SyncResult } from "../core/syncResult";
import { createSyncActivityLogs } from "./createSyncActivityLogs";
import { createSyncGoalFreezePeriods } from "./createSyncGoalFreezePeriods";
import { createSyncGoals } from "./createSyncGoals";
import { createSyncNotes } from "./createSyncNotes";
import { createSyncTasks } from "./createSyncTasks";
import type {
  GoalPending,
  Pending,
  V2ApiResponse,
  V2SyncApi,
  V2SyncRepos,
} from "./v2SyncTypes";

async function toSyncResult(
  res: V2ApiResponse,
  label: string,
): Promise<SyncResult> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  return (await res.json()) as SyncResult;
}

/**
 * Builds the standard v2 entity sync functions shared by Web and Mobile.
 * Platform-specific pieces (typed apiClient endpoints, DB-backed repositories)
 * are injected; everything else — chunking, _syncStatus stripping, SyncResult
 * handling, server-wins upserts — lives here so a new entity is wired once.
 *
 * Activities / icons are not included: their sync involves platform-specific
 * blob handling and stays in each app's `sync/syncActivities.ts`.
 */
export function createV2SyncFunctions<
  TLog extends Pending,
  TGoal extends GoalPending,
  TTask extends Pending,
  TNote extends Pending,
  TFreeze extends Pending,
>(deps: {
  api: V2SyncApi<TLog, TTask, TNote, TFreeze>;
  repos: V2SyncRepos<TLog, TGoal, TTask, TNote, TFreeze>;
}) {
  const { api, repos } = deps;

  const syncActivityLogs = createSyncActivityLogs<TLog>({
    getPendingSyncActivityLogs: () =>
      repos.activityLog.getPendingSyncActivityLogs(),
    postChunk: async (chunk) =>
      toSyncResult(
        await api.postActivityLogs({ logs: chunk }),
        "syncActivityLogs",
      ),
    markActivityLogsSynced: (ids) =>
      repos.activityLog.markActivityLogsSynced(ids),
    markActivityLogsFailed: (ids) =>
      repos.activityLog.markActivityLogsFailed(ids),
    upsertActivityLogsFromServer: (wins) =>
      repos.activityLog.upsertActivityLogsFromServer(wins),
  });

  const syncGoals = createSyncGoals<TGoal>({
    getPendingSyncGoals: () => repos.goal.getPendingSyncGoals(),
    postChunk: async (chunk) => {
      const goals = UpsertGoalRequestSchema.array().parse(chunk);
      return toSyncResult(await api.postGoals({ goals }), "syncGoals");
    },
    markGoalsSynced: (ids) => repos.goal.markGoalsSynced(ids),
    markGoalsFailed: (ids) => repos.goal.markGoalsFailed(ids),
    upsertGoalsFromServer: (wins) => repos.goal.upsertGoalsFromServer(wins),
  });

  const syncTasks = createSyncTasks<TTask>({
    getPendingSyncTasks: () => repos.task.getPendingSyncTasks(),
    postChunk: async (chunk) =>
      toSyncResult(await api.postTasks({ tasks: chunk }), "syncTasks"),
    markTasksSynced: (ids) => repos.task.markTasksSynced(ids),
    markTasksFailed: (ids) => repos.task.markTasksFailed(ids),
    upsertTasksFromServer: (wins) => repos.task.upsertTasksFromServer(wins),
  });

  const syncNotes = createSyncNotes<TNote>({
    getPendingSyncNotes: () => repos.note.getPendingSyncNotes(),
    postChunk: async (chunk) =>
      toSyncResult(await api.postNotes({ notes: chunk }), "syncNotes"),
    markNotesSynced: (ids) => repos.note.markNotesSynced(ids),
    markNotesFailed: (ids) => repos.note.markNotesFailed(ids),
    upsertNotesFromServer: (wins) => repos.note.upsertNotesFromServer(wins),
  });

  const syncGoalFreezePeriods = createSyncGoalFreezePeriods<TFreeze>({
    getPendingSyncFreezePeriods: () =>
      repos.goalFreezePeriod.getPendingSyncFreezePeriods(),
    postChunk: async (chunk) =>
      toSyncResult(
        await api.postGoalFreezePeriods({ freezePeriods: chunk }),
        "syncGoalFreezePeriods",
      ),
    markFreezePeriodsSynced: (ids) =>
      repos.goalFreezePeriod.markFreezePeriodsSynced(ids),
    markFreezePeriodsFailed: (ids) =>
      repos.goalFreezePeriod.markFreezePeriodsFailed(ids),
    upsertFreezePeriodsFromServer: (wins) =>
      repos.goalFreezePeriod.upsertFreezePeriodsFromServer(wins),
  });

  return {
    syncActivityLogs,
    syncGoals,
    syncTasks,
    syncNotes,
    syncGoalFreezePeriods,
  };
}
