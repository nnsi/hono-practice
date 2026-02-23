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
} from "../utils/apiMappers";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function performInitialSync(userId: string) {
  // authState を更新
  await db.authState.put({
    id: "current",
    userId,
    lastLoginAt: new Date().toISOString(),
  });

  const lastSyncedAt = localStorage.getItem(LAST_SYNCED_KEY);
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
    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
