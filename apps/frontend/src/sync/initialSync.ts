import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import { createInitialSync } from "@packages/sync-engine";

import { apiClient } from "../api/apiClient";
import { customFetch } from "../api/customFetch";
import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { goalRepository } from "../db/goalRepository";
import { noteRepository } from "../db/noteRepository";
import { db } from "../db/schema";
import { taskRepository } from "../db/taskRepository";
import { reportError } from "../utils/errorReporter";
import { webStorageAdapter } from "./webPlatformAdapters";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

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
  fetchAllApis: async (sinceByResource) => {
    const logsQuery = sinceByResource.logs
      ? { since: sinceByResource.logs }
      : {};
    const goalsQuery = sinceByResource.goals
      ? { since: sinceByResource.goals, clientDate: getToday() }
      : { clientDate: getToday() };
    const tasksQuery = sinceByResource.tasks
      ? { since: sinceByResource.tasks }
      : {};
    const notesQuery = sinceByResource.notes
      ? { since: sinceByResource.notes }
      : {};
    const freezePeriodsUrl = sinceByResource.freezePeriods
      ? `${API_URL}/users/v2/goal-freeze-periods?since=${encodeURIComponent(
          sinceByResource.freezePeriods,
        )}`
      : `${API_URL}/users/v2/goal-freeze-periods`;
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
      customFetch(freezePeriodsUrl).catch(() => null),
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
    // Dexie can commit the multi-store pull as one unit on Web.
    await db.transaction(
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
      async () => {
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
    );
  },
  deltaResources: DELTA_SYNC_RESOURCES,
  legacyBootstrappedResources: LEGACY_BOOTSTRAPPED_RESOURCES,
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
