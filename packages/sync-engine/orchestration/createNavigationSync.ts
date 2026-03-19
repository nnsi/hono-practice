type NavigationSyncDeps = {
  syncAll: () => Promise<void>;
  pullSync: () => Promise<void>;
  isOnline: () => boolean;
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

    Promise.all([deps.syncAll(), deps.pullSync()]).catch((err) => {
      console.error("[nav-sync]", err);
      deps.onError?.(err);
    });
  };
}
