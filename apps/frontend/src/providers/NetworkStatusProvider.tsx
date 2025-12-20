import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { NetworkStatus } from "@frontend/hooks/useNetworkStatus";
import { useNetworkStatus } from "@frontend/hooks/useNetworkStatus";

const NetworkStatusContext = createContext<NetworkStatus | undefined>(
  undefined,
);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();

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
