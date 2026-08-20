import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { createV2InitialSync } from "@packages/sync-engine";

import { apiClient } from "../api/apiClient";
import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { goalRepository } from "../db/goalRepository";
import { noteRepository } from "../db/noteRepository";
import { db } from "../db/schema";
import { taskRepository } from "../db/taskRepository";
import { reportError } from "../utils/errorReporter";
import { webStorageAdapter } from "./webPlatformAdapters";

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
    await db.activityLogs.clear();
    await db.activities.clear();
    await db.activityKinds.clear();
    await db.goals.clear();
    await db.goalFreezePeriods.clear();
    await db.tasks.clear();
    await db.notes.clear();
    await db.activityIconBlobs.clear();
    await db.activityIconDeleteQueue.clear();
  },
  updateAuthState: async (userId) => {
    const existing = await db.authState.get("current");
    await db.authState.put({
      id: "current",
      userId,
      lastLoginAt: new Date().toISOString(),
      plan: existing?.plan,
      tutorialStatus: existing?.tutorialStatus,
    });
  },
  isLocalDataEmpty: async () => {
    const [logCount, goalCount, freezePeriodCount, taskCount, noteCount] =
      await Promise.all([
        db.activityLogs.count(),
        db.goals.count(),
        db.goalFreezePeriods.count(),
        db.tasks.count(),
        db.notes.count(),
      ]);
    return (
      logCount === 0 &&
      goalCount === 0 &&
      freezePeriodCount === 0 &&
      taskCount === 0 &&
      noteCount === 0
    );
  },
  // Dexie can commit the multi-store pull as one unit on Web.
  runWriteTransaction: (write) =>
    db.transaction(
      "rw",
      [
        db.activities,
        db.activityKinds,
        db.activityLogs,
        db.goals,
        db.goalFreezePeriods,
        db.tasks,
        db.notes,
      ],
      write,
    ),
  defaultStorage: webStorageAdapter,
  onError: (error, phase) => {
    reportError({
      errorType: "unhandled_error",
      message: `Initial sync ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  },
});

export { clearLocalData, performInitialSync };
