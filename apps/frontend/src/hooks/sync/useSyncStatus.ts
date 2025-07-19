import { useEffect, useState } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { getSyncManagerInstance } from "@frontend/services/sync";

import type { SyncStatus } from "@frontend/services/sync";

export function useSyncStatus() {
  const { user } = useAuth();
  const syncManager = getSyncManagerInstance(user?.id);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncManager.getSyncStatus(),
  );

  useEffect(() => {
    // ユーザーIDが変わった場合に更新
    syncManager.updateUserId(user?.id);

    const unsubscribe = syncManager.subscribeToStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, [user?.id]);

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
