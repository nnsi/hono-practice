import { useEffect, useState } from "react";

import type { SyncManager, SyncStatus } from "../types";

export type UseSyncStatusDependencies = {
  user?: { id: string } | null;
  getSyncManagerInstance: (userId?: string) => SyncManager;
};

export function createUseSyncStatus(dependencies: UseSyncStatusDependencies) {
  const { user, getSyncManagerInstance } = dependencies;
  const syncManager = getSyncManagerInstance(user?.id);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncManager.getSyncStatus(),
  );

  useEffect(() => {
    // Update user ID when it changes
    syncManager.updateUserId(user?.id);

    const unsubscribe = syncManager.subscribeToStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, [user?.id, syncManager]);

  return {
    ...syncStatus,
    hasPendingSync: syncStatus.pendingCount > 0,
    isSyncing: syncStatus.syncingCount > 0,
    isFullySynced:
      syncStatus.pendingCount === 0 && syncStatus.failedCount === 0,
    syncNow: () => syncManager.syncBatch(),
    syncAll: () => syncManager.syncAll(),
    clearQueue: () => syncManager.clearQueue(),
  };
}
