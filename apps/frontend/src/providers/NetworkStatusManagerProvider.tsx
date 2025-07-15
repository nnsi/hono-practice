import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { createSimulatedNetworkStatusManager } from "@frontend/services/abstractions";

import type { NetworkStatusManager } from "@frontend/services/abstractions";

type NetworkStatusManagerContextValue = {
  networkStatusManager: NetworkStatusManager;
};

const NetworkStatusManagerContext = createContext<
  NetworkStatusManagerContextValue | undefined
>(undefined);

export type NetworkStatusManagerProviderProps = {
  children: ReactNode;
  networkStatusManager?: NetworkStatusManager;
};

export const NetworkStatusManagerProvider = ({
  children,
  networkStatusManager = createSimulatedNetworkStatusManager(),
}: NetworkStatusManagerProviderProps) => {
  return (
    <NetworkStatusManagerContext.Provider value={{ networkStatusManager }}>
      {children}
    </NetworkStatusManagerContext.Provider>
  );
};

export const useNetworkStatusManager = () => {
  const context = useContext(NetworkStatusManagerContext);
  if (!context) {
    throw new Error(
      "useNetworkStatusManager must be used within a NetworkStatusManagerProvider",
    );
  }
  return context.networkStatusManager;
};
