import type { StorageAdapter } from "@packages/platform";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiGoalFreezePeriod,
  mapApiTask,
} from "@packages/sync-engine";

import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalFreezePeriodRepository } from "../db/goalFreezePeriodRepository";
import { goalRepository } from "../db/goalRepository";
import { db } from "../db/schema";
import { taskRepository } from "../db/taskRepository";
import { apiClient, customFetch } from "../utils/apiClient";
import { getSyncGeneration, invalidateSync } from "./syncState";
import { webStorageAdapter } from "./webPlatformAdapters";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function clearLocalData(
  storage: StorageAdapter = webStorageAdapter,
) {
  invalidateSync();
  await db.activityLogs.clear();
  await db.activities.clear();
  await db.activityKinds.clear();
  await db.goals.clear();
  await db.goalFreezePeriods.clear();
  await db.tasks.clear();
  await db.activityIconBlobs.clear();
  await db.activityIconDeleteQueue.clear();
  // auth_stateはクリアしない。auth_stateはuseAuthが管理する責務:
  // - logout() → lastLoginAtを空にして無効化
  // - performInitialSync() → INSERT OR REPLACEで新ユーザーに更新
  storage.removeItem(LAST_SYNCED_KEY);
}

export async function performInitialSync(
  userId: string,
  storage: StorageAdapter = webStorageAdapter,
) {
  // authState を更新
  await db.authState.put({
    id: "current",
    userId,
    lastLoginAt: new Date().toISOString(),
  });

  // DBが空なのにLAST_SYNCED_KEYが残っている場合（DB再作成・手動クリア等）、
  // since付きでAPIを叩くと古いデータが取得されない。
  // since対象テーブル（activityLogs, goals, tasks）が全て空ならフル同期にする。
  // ※ activitiesは常にフル取得（sinceなし）なのでチェック不要。
  let lastSyncedAt = storage.getItem(LAST_SYNCED_KEY);
  if (lastSyncedAt) {
    const [logCount, goalCount, freezePeriodCount, taskCount] =
      await Promise.all([
        db.activityLogs.count(),
        db.goals.count(),
        db.goalFreezePeriods.count(),
        db.tasks.count(),
      ]);
    if (
      logCount === 0 &&
      goalCount === 0 &&
      freezePeriodCount === 0 &&
      taskCount === 0
    ) {
      storage.removeItem(LAST_SYNCED_KEY);
      lastSyncedAt = null;
    }
  }
  const sinceQuery = lastSyncedAt ? { since: lastSyncedAt } : {};

  const gen = getSyncGeneration();

  // 全APIを並列で取得（直列→並列で2-3秒短縮）
  const freezePeriodsUrl = lastSyncedAt
    ? `${API_URL}/users/v2/goal-freeze-periods?since=${encodeURIComponent(lastSyncedAt)}`
    : `${API_URL}/users/v2/goal-freeze-periods`;
  const [activitiesRes, logsRes, goalsRes, freezePeriodsRes, tasksRes] =
    await Promise.all([
      apiClient.users.v2.activities.$get(),
      apiClient.users.v2["activity-logs"].$get({ query: sinceQuery }),
      apiClient.users.v2.goals.$get({ query: sinceQuery }),
      customFetch(freezePeriodsUrl).catch(() => null),
      apiClient.users.v2.tasks.$get({ query: sinceQuery }),
    ]);

  if (gen !== getSyncGeneration()) return;

  // レスポンスをパースしてデータを収集（DB書き込みはまだ行わない）
  let allSynced = true;
  let activitiesData: ReturnType<typeof mapApiActivity>[] = [];
  let kindsData: ReturnType<typeof mapApiActivityKind>[] = [];
  let logsData: ReturnType<typeof mapApiActivityLog>[] = [];
  let goalsData: ReturnType<typeof mapApiGoal>[] = [];
  let freezePeriodsData: ReturnType<typeof mapApiGoalFreezePeriod>[] = [];
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

  if (freezePeriodsRes?.ok) {
    const data = (await freezePeriodsRes.json()) as {
      freezePeriods?: unknown[];
    };
    if (data.freezePeriods && data.freezePeriods.length > 0) {
      freezePeriodsData = (
        data.freezePeriods as (Record<string, unknown> & { id: string })[]
      ).map(mapApiGoalFreezePeriod);
    }
  } else {
    // Backend endpoint may not exist yet - don't block sync
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
  // テーブルごとに個別書き込みするとuseLiveQueryが中間状態（新goals + 旧logs等）を描画してしまう。
  const hasData =
    activitiesData.length > 0 ||
    kindsData.length > 0 ||
    logsData.length > 0 ||
    goalsData.length > 0 ||
    freezePeriodsData.length > 0 ||
    tasksData.length > 0;

  if (hasData) {
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
        if (freezePeriodsData.length > 0) {
          await goalFreezePeriodRepository.upsertFreezePeriodsFromServer(
            freezePeriodsData,
          );
        }
        if (tasksData.length > 0) {
          await taskRepository.upsertTasksFromServer(tasksData);
        }
      },
    );
  }

  if (gen !== getSyncGeneration()) return;

  if (allSynced) {
    storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
