import { createInitialSync } from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { activityRepository } from "../repositories/activityRepository";
import { goalFreezePeriodRepository } from "../repositories/goalFreezePeriodRepository";
import { goalRepository } from "../repositories/goalRepository";
import { taskRepository } from "../repositories/taskRepository";
import { apiClient } from "../utils/apiClient";
import { rnStorageAdapter } from "./rnPlatformAdapters";

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
      DELETE FROM activity_icon_blobs;
      DELETE FROM activity_icon_delete_queue;
    `);
  },
  updateAuthState: async (userId) => {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO auth_state (id, user_id, last_login_at) VALUES ('current', ?, ?)",
      [userId, new Date().toISOString()],
    );
  },
  isLocalDataEmpty: async () => {
    const db = await getDatabase();
    const [logRow, goalRow, taskRow, freezePeriodRow] = await Promise.all([
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
    ]);
    return (
      (logRow?.count ?? 0) === 0 &&
      (goalRow?.count ?? 0) === 0 &&
      (taskRow?.count ?? 0) === 0 &&
      (freezePeriodRow?.count ?? 0) === 0
    );
  },
  fetchAllApis: async (sinceQuery) => {
    const [activitiesRes, logsRes, goalsRes, freezePeriodsRes, tasksRes] =
      await Promise.all([
        apiClient.users.v2.activities.$get(),
        apiClient.users.v2["activity-logs"].$get({ query: sinceQuery }),
        apiClient.users.v2.goals.$get({ query: sinceQuery }),
        apiClient.users.v2["goal-freeze-periods"]
          .$get({ query: sinceQuery })
          .catch(() => null),
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
    // 各 repository が独自に BEGIN/COMMIT を管理しているため
    // ここで withTransactionAsync を使うとネストして失敗する
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
  defaultStorage: rnStorageAdapter,
});

export { clearLocalData, performInitialSync };
