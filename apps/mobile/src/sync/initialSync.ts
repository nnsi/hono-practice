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
  updateAuthState: async (userId) => {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ plan: string | null }>(
      "SELECT plan FROM auth_state WHERE id = 'current'",
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO auth_state (id, user_id, last_login_at, plan) VALUES ('current', ?, ?, ?)",
      [userId, new Date().toISOString(), existing?.plan ?? "free"],
    );
  },
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
      // TODO: freeze periodsの.catch(() => null)は後方互換のために残っている。エンドポイント安定後に削除を検討
      apiClient.users.v2["goal-freeze-periods"]
        .$get({ query: freezePeriodsQuery })
        .catch(() => null),
      apiClient.users.v2.tasks.$get({ query: tasksQuery }),
      apiClient.users.v2.notes.$get({ query: notesQuery }).catch(() => null),
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
    if (data.notes.length > 0) {
      await noteRepository.upsertNotesFromServer(data.notes);
    }
  },
  deltaResources: DELTA_SYNC_RESOURCES,
  legacyBootstrappedResources: LEGACY_BOOTSTRAPPED_RESOURCES,
  defaultStorage: rnStorageAdapter,
});

export { clearLocalData, performInitialSync };
