import { type ReactNode, createContext } from "react";

import type { NetworkStatus } from "@frontend/hooks/useNetworkStatus";

export const createMockNetworkStatus = (
  overrides?: Partial<NetworkStatus>,
): NetworkStatus => ({
  isOnline: true,
  lastOnlineAt: null,
  lastOfflineAt: null,
  isSimulated: false,
  ...overrides,
});

export const MockNetworkStatusContext = createContext<
  NetworkStatus | undefined
>(undefined);

type MockNetworkStatusProviderProps = {
  children: ReactNode;
  mockValue?: Partial<NetworkStatus>;
};

export const MockNetworkStatusProvider: React.FC<
  MockNetworkStatusProviderProps
> = ({ children, mockValue = {} }) => {
  const defaultMockValue = createMockNetworkStatus(mockValue);

  return (
    <MockNetworkStatusContext.Provider value={defaultMockValue}>
      {children}
    </MockNetworkStatusContext.Provider>
  );
};
