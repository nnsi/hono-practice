import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { useNetworkStatus } from "@frontend/hooks/useNetworkStatus";
import { SyncManager } from "@frontend/services/sync";

import type { NetworkStatus } from "@frontend/hooks/useNetworkStatus";

const NetworkStatusContext = createContext<NetworkStatus | undefined>(
  undefined,
);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();
  const { user } = useAuth();

  useEffect(() => {
    const syncManager = SyncManager.getInstance(user?.id);

    // ユーザーIDが変わった場合に更新
    syncManager.updateUserId(user?.id);

    if (!networkStatus.isOnline) {
      const statusMsg = networkStatus.isSimulated ? "（模擬）" : "";
      console.log(`[NetworkStatus] オフライン${statusMsg}になりました`);
      syncManager.stopAutoSync();
    } else {
      const statusMsg =
        networkStatus.isSimulated === false ? "（模擬解除）" : "";
      console.log(`[NetworkStatus] オンライン${statusMsg}になりました`);
      syncManager.startAutoSync();

      if (syncManager.getSyncStatus().pendingCount > 0) {
        console.log("[NetworkStatus] 未同期データを同期します...");
        syncManager.syncBatch().catch((error) => {
          console.error("[NetworkStatus] 同期エラー:", error);
        });
      }
    }
  }, [networkStatus.isOnline, user?.id]);

  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatusContext(): NetworkStatus {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error(
      "useNetworkStatusContext must be used within NetworkStatusProvider",
    );
  }
  return context;
}
