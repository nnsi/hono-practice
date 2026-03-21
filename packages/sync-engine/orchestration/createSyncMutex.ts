/**
 * Simple skip-if-busy mutex for sync operations.
 * When a sync (push or pull) is in progress, subsequent requests are skipped
 * rather than queued — sync runs periodically so the next cycle will pick up.
 */
export type SyncMutex = {
  /** Returns true if another sync operation is currently running */
  isBusy: () => boolean;
  /**
   * Try to acquire the lock and run `fn`.
   * If already locked, returns immediately without running `fn`.
   */
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

export function createSyncMutex(): SyncMutex {
  let busy = false;

  return {
    isBusy: () => busy,
    async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (busy) return undefined;
      busy = true;
      try {
        return await fn();
      } finally {
        busy = false;
      }
    },
  };
}
