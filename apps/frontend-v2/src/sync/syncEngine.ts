import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { goalRepository } from "../db/goalRepository";
import { taskRepository } from "../db/taskRepository";
import { apiFetch } from "../utils/apiClient";
import type { SyncActivityLogsResponse } from "@packages/types-v2";

let isSyncing = false;
let retryCount = 0;
const BASE_DELAY_MS = 1000;

type SyncResult = {
  syncedIds: string[];
  serverWins: Record<string, unknown>[];
  skippedIds: string[];
};

export const syncEngine = {
  async syncActivityLogs(): Promise<void> {
    const pending = await activityLogRepository.getPendingSyncActivityLogs();
    if (pending.length === 0) return;

    const logs = pending.map(({ _syncStatus, ...log }) => log);

    const res = await apiFetch("/users/v2/activity-logs/sync", {
      method: "POST",
      body: JSON.stringify({ logs }),
    });

    if (res.ok) {
      const data: SyncActivityLogsResponse = await res.json();
      await activityLogRepository.markActivityLogsSynced(data.syncedIds);
      if (data.serverWins.length > 0) {
        await activityLogRepository.upsertActivityLogsFromServer(
          data.serverWins,
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

    const res = await apiFetch("/users/v2/activities/sync", {
      method: "POST",
      body: JSON.stringify({
        activities: activitiesData,
        activityKinds: kindsData,
      }),
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
          data.activities.serverWins as Parameters<
            typeof activityRepository.upsertActivities
          >[0],
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
          data.activityKinds.serverWins as Parameters<
            typeof activityRepository.upsertActivityKinds
          >[0],
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

    const res = await apiFetch("/users/v2/goals/sync", {
      method: "POST",
      body: JSON.stringify({ goals }),
    });

    if (res.ok) {
      const data: SyncResult = await res.json();
      await goalRepository.markGoalsSynced(data.syncedIds);
      await goalRepository.markGoalsFailed(data.skippedIds);
      if (data.serverWins.length > 0) {
        await goalRepository.upsertGoalsFromServer(
          data.serverWins as Parameters<
            typeof goalRepository.upsertGoalsFromServer
          >[0],
        );
      }
    }
  },

  async syncTasks(): Promise<void> {
    const pending = await taskRepository.getPendingSyncTasks();
    if (pending.length === 0) return;

    const tasks = pending.map(({ _syncStatus, ...t }) => t);

    const res = await apiFetch("/users/v2/tasks/sync", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    });

    if (res.ok) {
      const data: SyncResult = await res.json();
      await taskRepository.markTasksSynced(data.syncedIds);
      await taskRepository.markTasksFailed(data.skippedIds);
      if (data.serverWins.length > 0) {
        await taskRepository.upsertTasksFromServer(
          data.serverWins as Parameters<
            typeof taskRepository.upsertTasksFromServer
          >[0],
        );
      }
    }
  },

  async syncAll(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      // Sync in dependency order: activities first, then others
      await syncEngine.syncActivities();
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
