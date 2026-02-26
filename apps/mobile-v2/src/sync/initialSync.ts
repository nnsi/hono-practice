import type { StorageAdapter } from "@packages/domain/sync/platformAdapters";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "@packages/domain/sync/apiMappers";
import { activityRepository } from "../repositories/activityRepository";
import { activityLogRepository } from "../repositories/activityLogRepository";
import { goalRepository } from "../repositories/goalRepository";
import { taskRepository } from "../repositories/taskRepository";
import { getDatabase } from "../db/database";
import {
  apiFetchActivities,
  apiFetchActivityLogs,
  apiFetchGoals,
  apiFetchTasks,
} from "../utils/apiClient";
import { rnStorageAdapter } from "./rnPlatformAdapters";

const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";

export async function clearLocalDataForUserSwitch(
  storage: StorageAdapter = rnStorageAdapter,
) {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM activity_logs;
    DELETE FROM activities;
    DELETE FROM activity_kinds;
    DELETE FROM goals;
    DELETE FROM tasks;
    DELETE FROM activity_icon_blobs;
    DELETE FROM activity_icon_delete_queue;
    DELETE FROM auth_state;
  `);
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

  const lastSyncedAt = storage.getItem(LAST_SYNCED_KEY);

  // Fetch all data in parallel
  const [activitiesRes, logsRes, goalsRes, tasksRes] = await Promise.all([
    apiFetchActivities(),
    apiFetchActivityLogs(lastSyncedAt ?? undefined),
    apiFetchGoals(lastSyncedAt ?? undefined),
    apiFetchTasks(lastSyncedAt ?? undefined),
  ]);

  let allSynced = true;

  // Process activities + activityKinds
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

  // Process activityLogs
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

  // Process goals
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

  // Process tasks
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

  // Only update lastSyncedAt if all synced successfully
  if (allSynced) {
    storage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }
}
