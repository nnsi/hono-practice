import { activityRepository } from "../db/activityRepository";
import { activityLogRepository } from "../db/activityLogRepository";
import { db } from "../db/schema";
import { apiFetch } from "../utils/apiClient";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
} from "../utils/apiMappers";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function performInitialSync(userId: string) {
  // authState を更新
  await db.authState.put({
    id: "current",
    userId,
    lastLoginAt: new Date().toISOString(),
  });

  let activitiesSynced = false;
  let logsSynced = false;

  // activities + activityKinds を取得
  const activitiesRes = await apiFetch("/users/v2/activities");
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
    activitiesSynced = true;
  }

  // activityLogs を取得（差分同期対応）
  const lastSyncedAt = localStorage.getItem(LAST_SYNCED_KEY);
  const logsUrl = lastSyncedAt
    ? `/users/v2/activity-logs?since=${encodeURIComponent(lastSyncedAt)}`
    : "/users/v2/activity-logs";

  const logsRes = await apiFetch(logsUrl);
  if (logsRes.ok) {
    const data = await logsRes.json();
    if (data.logs?.length > 0) {
      await activityLogRepository.upsertActivityLogsFromServer(
        data.logs.map(mapApiActivityLog),
      );
    }
    logsSynced = true;
  }

  // Only update lastSyncedAt if both synced
  if (activitiesSynced && logsSynced) {
    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
