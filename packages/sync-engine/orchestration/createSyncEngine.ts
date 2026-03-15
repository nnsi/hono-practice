import type { NetworkAdapter } from "@packages/platform";

type SyncFunctions = {
  syncActivityIconDeletions: () => Promise<void>;
  syncActivities: () => Promise<void>;
  syncActivityIcons: () => Promise<void>;
  syncActivityLogs: () => Promise<void>;
  syncGoals: () => Promise<void>;
  syncGoalFreezePeriods: () => Promise<void>;
  syncTasks: () => Promise<void>;
};

export function createSyncEngine(
  fns: SyncFunctions,
  defaultNetwork: NetworkAdapter,
) {
  let isSyncing = false;
  let retryCount = 0;
  const BASE_DELAY_MS = 1000;

  const engine = {
    syncActivityLogs: fns.syncActivityLogs,
    syncActivities: fns.syncActivities,
    syncActivityIconDeletions: fns.syncActivityIconDeletions,
    syncActivityIcons: fns.syncActivityIcons,
    syncGoals: fns.syncGoals,
    syncGoalFreezePeriods: fns.syncGoalFreezePeriods,
    syncTasks: fns.syncTasks,

    async syncAll(): Promise<void> {
      if (isSyncing) return;
      isSyncing = true;

      try {
        // Icon deletions first (before activity sync overwrites server URLs)
        await fns.syncActivityIconDeletions();
        // Sync in dependency order: activities first, then others
        await fns.syncActivities();
        // Upload icons after activity sync (activity must exist on server)
        await fns.syncActivityIcons();
        await Promise.all([
          fns.syncActivityLogs(),
          fns.syncGoals(),
          fns.syncTasks(),
        ]);
        // Freeze periods depend on goals existing on server
        await fns.syncGoalFreezePeriods();
        retryCount = 0;
      } catch {
        retryCount++;
      } finally {
        isSyncing = false;
      }
    },

    startAutoSync(
      intervalMs = 30000,
      network: NetworkAdapter = defaultNetwork,
    ) {
      const sync = () => engine.syncAll();
      const removeOnlineListener = network.onOnline(sync);

      let timeoutId: ReturnType<typeof setTimeout>;
      const scheduleNext = () => {
        const delay =
          retryCount > 0
            ? Math.min(BASE_DELAY_MS * 2 ** retryCount, 5 * 60 * 1000)
            : intervalMs;
        timeoutId = setTimeout(async () => {
          if (network.isOnline()) await sync();
          scheduleNext();
        }, delay);
      };
      scheduleNext();

      if (network.isOnline()) sync();

      return () => {
        removeOnlineListener();
        clearTimeout(timeoutId);
      };
    },
  };

  return engine;
}
