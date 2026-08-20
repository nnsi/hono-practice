import type { NetworkAdapter } from "@packages/platform";

import { type SyncMutex, createSyncMutex } from "./createSyncMutex";

type SyncFunctions = {
  syncActivityIconDeletions: () => Promise<void>;
  syncActivities: () => Promise<void>;
  syncActivityIcons: () => Promise<void>;
  syncActivityLogs: () => Promise<void>;
  syncGoals: () => Promise<void>;
  syncGoalFreezePeriods: () => Promise<void>;
  syncNotes: () => Promise<void>;
  syncTasks: () => Promise<void>;
};

export type SyncErrorHandler = (error: unknown, phase: string) => void;

export function createSyncEngine(
  fns: SyncFunctions,
  defaultNetwork: NetworkAdapter,
  onSyncError?: SyncErrorHandler,
  mutex: SyncMutex = createSyncMutex(),
) {
  let retryCount = 0;
  const BASE_DELAY_MS = 1000;

  // 個別 sync 関数（syncEngine.syncNotes() 等の直接呼び出し）でも offline
  // gate を効かせるためのラッパー。fetch は即時 fail で安全だが、
  // _syncStatus が "failed" に飛んで pending インジケータが消える挙動を
  // 防ぐため、ネットワーク前段で no-op にする。
  const gate = (fn: () => Promise<void>) => async () => {
    if (!defaultNetwork.isOnline()) return;
    await fn();
  };

  const engine = {
    syncActivityLogs: gate(fns.syncActivityLogs),
    syncActivities: gate(fns.syncActivities),
    syncActivityIconDeletions: gate(fns.syncActivityIconDeletions),
    syncActivityIcons: gate(fns.syncActivityIcons),
    syncGoals: gate(fns.syncGoals),
    syncGoalFreezePeriods: gate(fns.syncGoalFreezePeriods),
    syncNotes: gate(fns.syncNotes),
    syncTasks: gate(fns.syncTasks),
    mutex,

    async syncAll(): Promise<void> {
      if (!defaultNetwork.isOnline()) return;

      await mutex.run(async () => {
        let succeeded = 0;
        let total = 0;

        const tryStep = async (
          name: string,
          fn: () => Promise<void>,
        ): Promise<boolean> => {
          total++;
          try {
            await fn();
            succeeded++;
            return true;
          } catch (err) {
            onSyncError?.(err, name);
            return false;
          }
        };

        // 1. Icon deletions (before activity sync overwrites server URLs)
        await tryStep(
          "syncActivityIconDeletions",
          fns.syncActivityIconDeletions,
        );

        // 2. Activities
        const activitiesOk = await tryStep(
          "syncActivities",
          fns.syncActivities,
        );

        // 3. Activity icons (depends on activities existing on server)
        if (activitiesOk) {
          await tryStep("syncActivityIcons", fns.syncActivityIcons);
        } else {
          total++;
        }

        // 4. Goals
        const goalsOk = await tryStep("syncGoals", fns.syncGoals);

        // 5. Tasks (before activity logs — logs can reference taskId)
        await tryStep("syncTasks", fns.syncTasks);

        // 6. Notes
        await tryStep("syncNotes", fns.syncNotes);

        // 7. Activity logs
        await tryStep("syncActivityLogs", fns.syncActivityLogs);

        // 8. Freeze periods (depends on goals existing on server)
        if (goalsOk) {
          await tryStep("syncGoalFreezePeriods", fns.syncGoalFreezePeriods);
        } else {
          total++;
        }

        // Backoff: only when ALL steps failed
        if (succeeded > 0) {
          retryCount = 0;
        } else {
          retryCount++;
        }
      });
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
