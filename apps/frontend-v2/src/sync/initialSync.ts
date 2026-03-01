import type { StorageAdapter } from "@packages/platform";
import { activityRepository } from "../db/activityRepository";
import { activityLogRepository } from "../db/activityLogRepository";
import { goalRepository } from "../db/goalRepository";
import { taskRepository } from "../db/taskRepository";
import { db } from "../db/schema";
import { apiClient } from "../utils/apiClient";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "@packages/sync-engine";
import { webStorageAdapter } from "./webPlatformAdapters";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function clearLocalData(storage: StorageAdapter = webStorageAdapter) {
  await db.activityLogs.clear();
  await db.activities.clear();
  await db.activityKinds.clear();
  await db.goals.clear();
  await db.tasks.clear();
  await db.activityIconBlobs.clear();
  await db.activityIconDeleteQueue.clear();
  await db.authState.clear();
  storage.removeItem(LAST_SYNCED_KEY);
}

export async function performInitialSync(userId: string, storage: StorageAdapter = webStorageAdapter) {
  // authState を更新
  await db.authState.put({
    id: "current",
    userId,
    lastLoginAt: new Date().toISOString(),
  });

  // DBが空なのにLAST_SYNCED_KEYが残っている場合（DB再作成・手動クリア等）、
  // since付きでAPIを叩くと古いデータが取得されない。全テーブル空ならフル同期にする。
  let lastSyncedAt = storage.getItem(LAST_SYNCED_KEY);
  if (lastSyncedAt) {
    const [logCount, goalCount, taskCount] = await Promise.all([
      db.activityLogs.count(),
      db.goals.count(),
      db.tasks.count(),
    ]);
    if (logCount === 0 && goalCount === 0 && taskCount === 0) {
      storage.removeItem(LAST_SYNCED_KEY);
      lastSyncedAt = null;
    }
  }
  const sinceQuery = lastSyncedAt ? { since: lastSyncedAt } : {};

  // 全APIを並列で取得（直列→並列で2-3秒短縮）
  const [activitiesRes, logsRes, goalsRes, tasksRes] = await Promise.all([
    apiClient.users.v2.activities.$get(),
    apiClient.users.v2["activity-logs"].$get({ query: sinceQuery }),
    apiClient.users.v2.goals.$get({ query: sinceQuery }),
    apiClient.users.v2.tasks.$get({ query: sinceQuery }),
  ]);

  let allSynced = true;

  // activities + activityKinds を処理
  if (activitiesRes.ok) {
    const data = await activitiesRes.json();
    await activityRepository.upsertActivities(
      data.activities.map(mapApiActivity),
    );
    if (data.activityKinds?.length > 0) {
      await activityRepository.upsertActivityKinds(
        data.activityKinds.map(mapApiActivityKind),
      );
    }
  } else {
    allSynced = false;
  }

  // activityLogs を処理
  if (logsRes.ok) {
    const data = await logsRes.json();
    if (data.logs?.length > 0) {
      await activityLogRepository.upsertActivityLogsFromServer(
        data.logs.map(mapApiActivityLog),
      );
    }
  } else {
    allSynced = false;
  }

  // goals を処理
  if (goalsRes.ok) {
    const data = await goalsRes.json();
    if (data.goals?.length > 0) {
      await goalRepository.upsertGoalsFromServer(
        data.goals.map(mapApiGoal),
      );
    }
  } else {
    allSynced = false;
  }

  // tasks を処理
  if (tasksRes.ok) {
    const data = await tasksRes.json();
    if (data.tasks?.length > 0) {
      await taskRepository.upsertTasksFromServer(
        data.tasks.map(mapApiTask),
      );
    }
  } else {
    allSynced = false;
  }

  // Only update lastSyncedAt if all synced
  if (allSynced) {
    storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
