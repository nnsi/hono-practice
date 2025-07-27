import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { eventBus } from "../utils/eventBus";

const SYNC_STATUS_KEY = "@sync_status";
const LAST_SYNC_KEY = "@last_sync_timestamp";

export function useSyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [totalUnsyncedCount, setTotalUnsyncedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadSyncStatus = async () => {
    try {
      const [statusData, lastSyncData] = await Promise.all([
        AsyncStorage.getItem(SYNC_STATUS_KEY),
        AsyncStorage.getItem(LAST_SYNC_KEY),
      ]);

      if (statusData) {
        const status = JSON.parse(statusData);
        setHasPendingSync(status.hasPendingSync || false);
        setTotalUnsyncedCount(status.totalUnsyncedCount || 0);
      }

      if (lastSyncData) {
        setLastSyncedAt(new Date(lastSyncData));
      }
    } catch (error) {
      console.error("Failed to load sync status:", error);
    }
  };

  const saveSyncStatus = async (status: {
    hasPendingSync: boolean;
    totalUnsyncedCount: number;
  }) => {
    try {
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  };

  const syncNow = async () => {
    if (isSyncing || !hasPendingSync) return;

    setIsSyncing(true);
    try {
      // TODO: 実際の同期処理を実装
      // ここでは仮の処理として2秒待機
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 同期成功後の処理
      setHasPendingSync(false);
      setTotalUnsyncedCount(0);
      const now = new Date();
      setLastSyncedAt(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      await saveSyncStatus({ hasPendingSync: false, totalUnsyncedCount: 0 });

      eventBus.emit("sync:completed");
    } catch (error) {
      console.error("Sync failed:", error);
      eventBus.emit("sync:failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadSyncStatus();

    // イベントリスナーの設定
    const unsubscribers = [
      eventBus.on("sync:pending", ({ count }: { count: number }) => {
        setHasPendingSync(true);
        setTotalUnsyncedCount(count);
        saveSyncStatus({ hasPendingSync: true, totalUnsyncedCount: count });
      }),
      eventBus.on("sync:started", () => {
        setIsSyncing(true);
      }),
      eventBus.on("sync:completed", () => {
        setIsSyncing(false);
        setHasPendingSync(false);
        setTotalUnsyncedCount(0);
      }),
      eventBus.on("sync:failed", () => {
        setIsSyncing(false);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  return {
    isSyncing,
    hasPendingSync,
    totalUnsyncedCount,
    lastSyncedAt,
    syncNow,
  };
}
