import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalRepository } from "../db/goalRepository";
import { taskRepository } from "../db/taskRepository";
import { db } from "../db/schema";
import { apiClient, customFetch } from "../utils/apiClient";
import {
  mapApiActivity,
  mapApiActivityKind,
  mapApiActivityLog,
  mapApiGoal,
  mapApiTask,
} from "../utils/apiMappers";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3456";
let isSyncing = false;
let retryCount = 0;
const BASE_DELAY_MS = 1000;

type ServerEntity = Record<string, unknown> & { id: string };

type SyncResult = {
  syncedIds: string[];
  serverWins: ServerEntity[];
  skippedIds: string[];
};

export const syncEngine = {
  async syncActivityLogs(): Promise<void> {
    const pending = await activityLogRepository.getPendingSyncActivityLogs();
    if (pending.length === 0) return;

    const logs = pending.map(({ _syncStatus, ...log }) => log);

    const res = await apiClient.users.v2["activity-logs"].sync.$post({
      json: { logs },
    });

    if (res.ok) {
      const data: SyncResult = await res.json();
      await activityLogRepository.markActivityLogsSynced(data.syncedIds);
      if (data.serverWins.length > 0) {
        await activityLogRepository.upsertActivityLogsFromServer(
          data.serverWins.map(mapApiActivityLog),
        );
      }
      await activityLogRepository.markActivityLogsFailed(data.skippedIds);
    }
  },

  async syncActivities(): Promise<void> {
    const pendingActivities =
      await activityRepository.getPendingSyncActivities();
    const pendingKinds =
      await activityRepository.getPendingSyncActivityKinds();

    if (pendingActivities.length === 0 && pendingKinds.length === 0) return;

    const activitiesData = pendingActivities.map(
      ({ _syncStatus, ...a }) => a,
    );
    const kindsData = pendingKinds.map(({ _syncStatus, ...k }) => k);

    const res = await apiClient.users.v2.activities.sync.$post({
      json: {
        activities: activitiesData,
        activityKinds: kindsData,
      },
    });

    if (res.ok) {
      const data: {
        activities: SyncResult;
        activityKinds: SyncResult;
      } = await res.json();

      await activityRepository.markActivitiesSynced(
        data.activities.syncedIds,
      );
      await activityRepository.markActivitiesFailed(
        data.activities.skippedIds,
      );
      if (data.activities.serverWins.length > 0) {
        await activityRepository.upsertActivities(
          data.activities.serverWins.map(mapApiActivity),
        );
      }

      await activityRepository.markActivityKindsSynced(
        data.activityKinds.syncedIds,
      );
      await activityRepository.markActivityKindsFailed(
        data.activityKinds.skippedIds,
      );
      if (data.activityKinds.serverWins.length > 0) {
        await activityRepository.upsertActivityKinds(
          data.activityKinds.serverWins.map(mapApiActivityKind),
        );
      }
    }
  },

  async syncGoals(): Promise<void> {
    const pending = await goalRepository.getPendingSyncGoals();
    if (pending.length === 0) return;

    const goals = pending.map(
      ({ _syncStatus, currentBalance, totalTarget, totalActual, ...g }) => g,
    );

    const res = await apiClient.users.v2.goals.sync.$post({
      json: { goals },
    });

    if (res.ok) {
      const data: SyncResult = await res.json();
      await goalRepository.markGoalsSynced(data.syncedIds);
      await goalRepository.markGoalsFailed(data.skippedIds);
      if (data.serverWins.length > 0) {
        await goalRepository.upsertGoalsFromServer(
          data.serverWins.map(mapApiGoal),
        );
      }
    }
  },

  async syncTasks(): Promise<void> {
    const pending = await taskRepository.getPendingSyncTasks();
    if (pending.length === 0) return;

    const tasks = pending.map(({ _syncStatus, ...t }) => t);

    const res = await apiClient.users.v2.tasks.sync.$post({
      json: { tasks },
    });

    if (res.ok) {
      const data: SyncResult = await res.json();
      await taskRepository.markTasksSynced(data.syncedIds);
      await taskRepository.markTasksFailed(data.skippedIds);
      if (data.serverWins.length > 0) {
        await taskRepository.upsertTasksFromServer(
          data.serverWins.map(mapApiTask),
        );
      }
    }
  },

  async syncActivityIconDeletions(): Promise<void> {
    const queue = await activityRepository.getPendingIconDeletes();
    if (queue.length === 0) return;

    for (const item of queue) {
      const res = await customFetch(
        `${API_URL}/users/activities/${item.activityId}/icon`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 404) {
        await activityRepository.removeIconDeleteQueue(item.activityId);
      }
    }
  },

  async syncActivityIcons(): Promise<void> {
    const blobs = await activityRepository.getPendingIconBlobs();
    if (blobs.length === 0) return;

    for (const blob of blobs) {
      const activity = await db.activities.get(blob.activityId);
      if (!activity || activity._syncStatus !== "synced") continue;

      const res = await customFetch(
        `${API_URL}/users/activities/${blob.activityId}/icon`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: blob.base64,
            mimeType: blob.mimeType,
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as {
          iconUrl: string;
          iconThumbnailUrl: string;
        };
        await activityRepository.completeActivityIconSync(
          blob.activityId,
          data.iconUrl,
          data.iconThumbnailUrl,
        );
      }
    }
  },

  async syncAll(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      // Icon deletions first (before activity sync overwrites server URLs)
      await syncEngine.syncActivityIconDeletions();
      // Sync in dependency order: activities first, then others
      await syncEngine.syncActivities();
      // Upload icons after activity sync (activity must exist on server)
      await syncEngine.syncActivityIcons();
      await Promise.all([
        syncEngine.syncActivityLogs(),
        syncEngine.syncGoals(),
        syncEngine.syncTasks(),
      ]);
      retryCount = 0;
    } catch {
      retryCount++;
    } finally {
      isSyncing = false;
    }
  },

  startAutoSync(intervalMs = 30000) {
    const sync = () => syncEngine.syncAll();

    window.addEventListener("online", sync);

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay =
        retryCount > 0
          ? Math.min(BASE_DELAY_MS * 2 ** retryCount, 5 * 60 * 1000)
          : intervalMs;
      timeoutId = setTimeout(async () => {
        if (navigator.onLine) await sync();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    // Immediate sync
    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener("online", sync);
      clearTimeout(timeoutId);
    };
  },
};
