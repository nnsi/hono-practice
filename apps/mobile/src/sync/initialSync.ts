import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { createInitialSync } from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { activityRepository } from "../repositories/activityRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { noteRepository } from "../repositories/noteRepository";
import { taskRepository } from "../repositories/taskRepository";
import { apiClient } from "../utils/apiClient";
import { reportError } from "../utils/errorReporter";
import { rnStorageAdapter } from "./rnPlatformAdapters";

const DELTA_SYNC_RESOURCES = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
  "notes",
] as const;

// Keep this list frozen. Future sync resources should be added only to
// DELTA_SYNC_RESOURCES so older clients full-pull the new resource once.
const LEGACY_BOOTSTRAPPED_RESOURCES = [
  "logs",
  "goals",
  "freezePeriods",
  "tasks",
] as const;

const { clearLocalData, performInitialSync } = createInitialSync({
  clearAllTables: async () => {
    const db = await getDatabase();
    await db.execAsync(`
      DELETE FROM activity_logs;
      DELETE FROM activities;
      DELETE FROM activity_kinds;
      DELETE FROM goals;
      DELETE FROM goal_freeze_periods;
      DELETE FROM tasks;
      DELETE FROM note;
      DELETE FROM activity_icon_blobs;
      DELETE FROM activity_icon_delete_queue;
    `);
  },
  // authController が applySession で user_id / last_login_at を立てるので no-op
  updateAuthState: async () => {},
  isLocalDataEmpty: async () => {
    const db = await getDatabase();
    const [logRow, goalRow, taskRow, freezePeriodRow, noteRow] =
      await Promise.all([
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM activity_logs",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM goals",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM tasks",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM goal_freeze_periods",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM note",
        ),
      ]);
    return (
      (logRow?.count ?? 0) === 0 &&
      (goalRow?.count ?? 0) === 0 &&
      (taskRow?.count ?? 0) === 0 &&
      (freezePeriodRow?.count ?? 0) === 0 &&
      (noteRow?.count ?? 0) === 0
    );
  },
  fetchAllApis: async (sinceByResource) => {
    const logsQuery = sinceByResource.logs
      ? { since: sinceByResource.logs }
      : {};
    const goalsQuery = sinceByResource.goals
      ? { since: sinceByResource.goals, clientDate: getToday() }
      : { clientDate: getToday() };
    const freezePeriodsQuery = sinceByResource.freezePeriods
      ? { since: sinceByResource.freezePeriods }
      : {};
    const tasksQuery = sinceByResource.tasks
      ? { since: sinceByResource.tasks }
      : {};
    const notesQuery = sinceByResource.notes
      ? { since: sinceByResource.notes }
      : {};
    const [
      activitiesRes,
      logsRes,
      goalsRes,
      freezePeriodsRes,
      tasksRes,
      notesRes,
    ] = await Promise.all([
      apiClient.users.v2.activities.$get(),
      apiClient.users.v2["activity-logs"].$get({ query: logsQuery }),
      apiClient.users.v2.goals.$get({ query: goalsQuery }),
      // Older backend deployments may still lack this endpoint during staged rollout.
      // Keep the same backward-compatibility fallback on both Web and Mobile.
      apiClient.users.v2["goal-freeze-periods"]
        .$get({ query: freezePeriodsQuery })
        .catch(() => null),
      apiClient.users.v2.tasks.$get({ query: tasksQuery }),
      // Notes are best-effort during bootstrap. Treat network failures as a
      // partial sync so other resources can still hydrate and watermark stays put.
      apiClient.users.v2.notes
        .$get({ query: notesQuery })
        .catch(() => null),
    ]);
    return {
      activitiesRes,
      logsRes,
      goalsRes,
      freezePeriodsRes,
      tasksRes,
      notesRes,
    };
  },
  writeAllData: async (data) => {
    // Mobile repositories manage sqlite transactions internally, so
    // adding an outer withTransactionAsync here would nest BEGIN/COMMIT.
    if (data.activities.length > 0) {
      await activityRepository.upsertActivities(data.activities);
    }
    if (data.activityKinds.length > 0) {
      await activityRepository.upsertActivityKinds(data.activityKinds);
    }
    if (data.logs.length > 0) {
      await activityLogRepository.upsertActivityLogsFromServer(data.logs);
    }
    if (data.goals.length > 0) {
      await goalRepository.upsertGoalsFromServer(data.goals);
    }
    if (data.freezePeriods.length > 0) {
      await goalFreezePeriodRepository.upsertFreezePeriodsFromServer(
        data.freezePeriods,
      );
    }
    if (data.tasks.length > 0) {
      await taskRepository.upsertTasksFromServer(data.tasks);
    }
    if (data.notes.length > 0) {
      await noteRepository.upsertNotesFromServer(data.notes);
    }
  },
  deltaResources: DELTA_SYNC_RESOURCES,
  legacyBootstrappedResources: LEGACY_BOOTSTRAPPED_RESOURCES,
  defaultStorage: rnStorageAdapter,
  onError: (error, phase) => {
    reportError({
      errorType: "unhandled_error",
      message: `Initial sync ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  },
});

export { clearLocalData, performInitialSync };
