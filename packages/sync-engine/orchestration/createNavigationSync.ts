import type { SyncMutex } from "./createSyncMutex";

type NavigationSyncDeps = {
  syncAll: () => Promise<void>;
  pullSync: () => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError?: (error: unknown) => void;
};

const THROTTLE_MS = 5000;

export function createNavigationSync(deps: NavigationSyncDeps) {
  let lastSyncAt = 0;

  return function triggerNavigationSync(): void {
    const now = Date.now();
    if (now - lastSyncAt < THROTTLE_MS) return;
    if (!deps.isOnline()) return;
    lastSyncAt = now;

    (async () => {
      try {
        await deps.mutex.run(() => deps.pullSync());
      } catch (err) {
        console.error("[nav-sync:pull]", err);
        deps.onError?.(err);
      }
      try {
        await deps.syncAll();
      } catch (err) {
        console.error("[nav-sync:push]", err);
        deps.onError?.(err);
      }
    })();
  };
}
