import type { NetworkAdapter } from "@packages/platform";
import {
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
} from "./syncActivities";
import { syncActivityLogs } from "./syncActivityLogs";
import { syncGoals } from "./syncGoals";
import { syncTasks } from "./syncTasks";
import { webNetworkAdapter } from "./webPlatformAdapters";

let isSyncing = false;
let retryCount = 0;
const BASE_DELAY_MS = 1000;

export const syncEngine = {
  syncActivityLogs,
  syncActivities,
  syncActivityIconDeletions,
  syncActivityIcons,
  syncGoals,
  syncTasks,

  async syncAll(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      // Icon deletions first (before activity sync overwrites server URLs)
      await syncActivityIconDeletions();
      // Sync in dependency order: activities first, then others
      await syncActivities();
      // Upload icons after activity sync (activity must exist on server)
      await syncActivityIcons();
      await Promise.all([
        syncActivityLogs(),
        syncGoals(),
        syncTasks(),
      ]);
      retryCount = 0;
    } catch {
      retryCount++;
    } finally {
      isSyncing = false;
    }
  },

  startAutoSync(intervalMs = 30000, network: NetworkAdapter = webNetworkAdapter) {
    const sync = () => syncEngine.syncAll();
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
