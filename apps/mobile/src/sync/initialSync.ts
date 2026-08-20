import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { createV2InitialSync } from "@packages/sync-engine";

import { apiClient } from "../api/apiClient";
import { getDatabase } from "../db/database";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { activityRepository } from "../repositories/activityRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { noteRepository } from "../repositories/noteRepository";
import { taskRepository } from "../repositories/taskRepository";
import { reportError } from "../utils/errorReporter";
import { rnStorageAdapter } from "./rnPlatformAdapters";

const { clearLocalData, performInitialSync } = createV2InitialSync({
  api: {
    getActivities: () => apiClient.users.v2.activities.$get(),
    getActivityLogs: (query) =>
      apiClient.users.v2["activity-logs"].$get({ query }),
    getGoals: (query) => apiClient.users.v2.goals.$get({ query }),
    getGoalFreezePeriods: (query) =>
      apiClient.users.v2["goal-freeze-periods"].$get({ query }),
    getTasks: (query) => apiClient.users.v2.tasks.$get({ query }),
    getNotes: (query) => apiClient.users.v2.notes.$get({ query }),
  },
  repos: {
    activity: activityRepository,
    activityLog: activityLogRepository,
    goal: goalRepository,
    goalFreezePeriod: goalFreezePeriodRepository,
    task: taskRepository,
    note: noteRepository,
  },
  getClientDate: getToday,
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
  // Mobile repositories manage sqlite transactions internally, so no
  // runWriteTransaction here (an outer withTransactionAsync would nest
  // BEGIN/COMMIT).
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
