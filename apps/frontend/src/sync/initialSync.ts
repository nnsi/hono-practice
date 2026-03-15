import { createInitialSync } from "@packages/sync-engine";

import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { goalRepository } from "../db/goalRepository";
import { db } from "../db/schema";
import { taskRepository } from "../db/taskRepository";
import { apiClient, customFetch } from "../utils/apiClient";
import { webStorageAdapter } from "./webPlatformAdapters";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

const { clearLocalData, performInitialSync } = createInitialSync({
  clearAllTables: async () => {
    await db.activityLogs.clear();
    await db.activities.clear();
    await db.activityKinds.clear();
    await db.goals.clear();
    await db.goalFreezePeriods.clear();
    await db.tasks.clear();
    await db.activityIconBlobs.clear();
    await db.activityIconDeleteQueue.clear();
  },
  updateAuthState: async (userId) => {
    await db.authState.put({
      id: "current",
      userId,
      lastLoginAt: new Date().toISOString(),
    });
  },
  isLocalDataEmpty: async () => {
    const [logCount, goalCount, freezePeriodCount, taskCount] =
      await Promise.all([
        db.activityLogs.count(),
        db.goals.count(),
        db.goalFreezePeriods.count(),
        db.tasks.count(),
      ]);
    return (
      logCount === 0 &&
      goalCount === 0 &&
      freezePeriodCount === 0 &&
      taskCount === 0
    );
  },
  fetchAllApis: async (sinceQuery) => {
    const freezePeriodsUrl = sinceQuery.since
      ? `${API_URL}/users/v2/goal-freeze-periods?since=${encodeURIComponent(sinceQuery.since)}`
      : `${API_URL}/users/v2/goal-freeze-periods`;
    const [activitiesRes, logsRes, goalsRes, freezePeriodsRes, tasksRes] =
      await Promise.all([
        apiClient.users.v2.activities.$get(),
        apiClient.users.v2["activity-logs"].$get({ query: sinceQuery }),
        apiClient.users.v2.goals.$get({ query: sinceQuery }),
        customFetch(freezePeriodsUrl).catch(() => null),
        apiClient.users.v2.tasks.$get({ query: sinceQuery }),
      ]);
    return {
      activitiesRes,
      logsRes,
      goalsRes,
      freezePeriodsRes,
      tasksRes,
    };
  },
  writeAllData: async (data) => {
    await db.transaction(
      "rw",
      [
        db.activities,
        db.activityKinds,
        db.activityLogs,
        db.goals,
        db.goalFreezePeriods,
        db.tasks,
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
      },
    );
  },
  defaultStorage: webStorageAdapter,
});

export { clearLocalData, performInitialSync };
