import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef } from "react";

import type { NetworkStatus } from "@frontend/hooks/useNetworkStatus";
import { useNetworkStatus } from "@frontend/hooks/useNetworkStatus";
import { useQueryClient } from "@tanstack/react-query";

const NetworkStatusContext = createContext<NetworkStatus | undefined>(
  undefined,
);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();
  const queryClient = useQueryClient();
  const prevOnlineRef = useRef(networkStatus.isOnline);

  // オンライン復帰時にpausedなmutationを再開してデータをリフレッシュ
  useEffect(() => {
    if (networkStatus.isOnline && !prevOnlineRef.current) {
      queryClient.resumePausedMutations().then(() => {
        queryClient.invalidateQueries();
      });
    }
    prevOnlineRef.current = networkStatus.isOnline;
  }, [networkStatus.isOnline, queryClient]);

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
