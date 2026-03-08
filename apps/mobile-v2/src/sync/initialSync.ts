import type { StorageAdapter } from "@packages/platform";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "@packages/sync-engine";

import { getDatabase } from "../db/database";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { activityRepository } from "../repositories/activityRepository";
import { goalRepository } from "../repositories/goalRepository";
import { taskRepository } from "../repositories/taskRepository";
import { apiClient } from "../utils/apiClient";
import { rnStorageAdapter } from "./rnPlatformAdapters";
import { getSyncGeneration, invalidateSync } from "./syncState";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function clearLocalData(
  storage: StorageAdapter = rnStorageAdapter,
) {
  invalidateSync();
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM activity_logs;
    DELETE FROM activities;
    DELETE FROM activity_kinds;
    DELETE FROM goals;
    DELETE FROM tasks;
    DELETE FROM activity_icon_blobs;
    DELETE FROM activity_icon_delete_queue;
  `);
  // auth_stateはクリアしない。auth_stateはuseAuthが管理する責務:
  // - logout() → last_login_atを空にして無効化
  // - performInitialSync() → INSERT OR REPLACEで新ユーザーに更新
  storage.removeItem(LAST_SYNCED_KEY);
}

export async function performInitialSync(
  userId: string,
  storage: StorageAdapter = rnStorageAdapter,
) {
  const db = await getDatabase();

  // Update auth state
  await db.runAsync(
    "INSERT OR REPLACE INTO auth_state (id, user_id, last_login_at) VALUES ('current', ?, ?)",
    [userId, new Date().toISOString()],
  );

  // DBが空なのにLAST_SYNCED_KEYが残っている場合（DB再作成・手動クリア等）、
  // since付きでAPIを叩くと古いデータが取得されない。全テーブル空ならフル同期にする。
  let lastSyncedAt = storage.getItem(LAST_SYNCED_KEY);
  if (lastSyncedAt) {
    const [logRow, goalRow, taskRow] = await Promise.all([
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM activity_logs",
      ),
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM goals",
      ),
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks",
      ),
    ]);
    if (
      (logRow?.count ?? 0) === 0 &&
      (goalRow?.count ?? 0) === 0 &&
      (taskRow?.count ?? 0) === 0
    ) {
      storage.removeItem(LAST_SYNCED_KEY);
      lastSyncedAt = null;
    }
  }
  const sinceQuery = lastSyncedAt ? { since: lastSyncedAt } : {};

  const gen = getSyncGeneration();

  // Fetch all data in parallel
  const [activitiesRes, logsRes, goalsRes, tasksRes] = await Promise.all([
    apiClient.users.v2.activities.$get(),
    apiClient.users.v2["activity-logs"].$get({ query: sinceQuery }),
    apiClient.users.v2.goals.$get({ query: sinceQuery }),
    apiClient.users.v2.tasks.$get({ query: sinceQuery }),
  ]);

  if (gen !== getSyncGeneration()) return;

  // レスポンスをパースしてデータを収集（DB書き込みはまだ行わない）
  let allSynced = true;
  let activitiesData: ReturnType<typeof mapApiActivity>[] = [];
  let kindsData: ReturnType<typeof mapApiActivityKind>[] = [];
  let logsData: ReturnType<typeof mapApiActivityLog>[] = [];
  let goalsData: ReturnType<typeof mapApiGoal>[] = [];
  let tasksData: ReturnType<typeof mapApiTask>[] = [];

  if (activitiesRes.ok) {
    const data = await activitiesRes.json();
    activitiesData = data.activities.map(mapApiActivity);
    if (data.activityKinds?.length > 0) {
      kindsData = data.activityKinds.map(mapApiActivityKind);
    }
  } else {
    allSynced = false;
  }

  if (logsRes.ok) {
    const data = await logsRes.json();
    if (data.logs?.length > 0) {
      logsData = data.logs.map(mapApiActivityLog);
    }
  } else {
    allSynced = false;
  }

  if (goalsRes.ok) {
    const data = await goalsRes.json();
    if (data.goals?.length > 0) {
      goalsData = data.goals.map(mapApiGoal);
    }
  } else {
    allSynced = false;
  }

  if (tasksRes.ok) {
    const data = await tasksRes.json();
    if (data.tasks?.length > 0) {
      tasksData = data.tasks.map(mapApiTask);
    }
  } else {
    allSynced = false;
  }

  if (gen !== getSyncGeneration()) return;

  // 全テーブルをトランザクションでアトミックに書き込み。
  // テーブルごとに個別書き込みするとリアクティブクエリが中間状態を描画してしまう。
  const hasData =
    activitiesData.length > 0 ||
    kindsData.length > 0 ||
    logsData.length > 0 ||
    goalsData.length > 0 ||
    tasksData.length > 0;

  if (hasData) {
    await db.withTransactionAsync(async () => {
      if (activitiesData.length > 0) {
        await activityRepository.upsertActivities(activitiesData);
      }
      if (kindsData.length > 0) {
        await activityRepository.upsertActivityKinds(kindsData);
      }
      if (logsData.length > 0) {
        await activityLogRepository.upsertActivityLogsFromServer(logsData);
      }
      if (goalsData.length > 0) {
        await goalRepository.upsertGoalsFromServer(goalsData);
      }
      if (tasksData.length > 0) {
        await taskRepository.upsertTasksFromServer(tasksData);
      }
    });
  }

  if (gen !== getSyncGeneration()) return;

  if (allSynced) {
    storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
