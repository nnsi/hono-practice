import { useEffect, useState } from "react";

import type { NetworkAdapter, StorageAdapter } from "../adapters";

export type UseNetworkStatusOptions = {
  network: NetworkAdapter;
  storage?: StorageAdapter;
  simulatedOffline?: boolean;
};

export type UseNetworkStatusReturn = {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  isSimulated?: boolean;
};

// Development environment offline simulation
let simulatedOffline = false;
let simulatedOfflineListeners: Array<() => void> = [];

export function setSimulatedOffline(offline: boolean) {
  simulatedOffline = offline;
  simulatedOfflineListeners.forEach((listener) => listener());
}

export function getSimulatedOffline(): boolean {
  return simulatedOffline;
}

// Development detection helper
function checkIsDevelopment(): boolean {
  // Check for Node.js environment
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    return true;
  }

  // For browser environments, always enable simulated offline feature
  // The actual toggle button is already protected by import.meta.env.DEV
  // in NetworkDebugToggle component, so it won't appear in production
  return true;
}

export function createUseNetworkStatus(
  options: UseNetworkStatusOptions,
): UseNetworkStatusReturn {
  const { network, storage, simulatedOffline: initialSimulated } = options;
  const isDevelopment = checkIsDevelopment();

  const [isOnline, setIsOnline] = useState(() => {
    const shouldBeOnline =
      isDevelopment && simulatedOffline ? false : network.isOnline();

    // Save initial state to storage if provided
    if (storage) {
      storage.setItem("network-status", shouldBeOnline ? "online" : "offline");
    }

    return shouldBeOnline;
  });

  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null);
  const [isSimulated, setIsSimulated] = useState(
    isDevelopment && (initialSimulated || simulatedOffline),
  );

  useEffect(() => {
    const updateNetworkStatus = (online: boolean) => {
      // In development, check simulated offline state
      const shouldBeOnline = isDevelopment && simulatedOffline ? false : online;

      setIsOnline(shouldBeOnline);
      setIsSimulated(isDevelopment && simulatedOffline);

      // Save state to storage if provided
      if (storage) {
        storage.setItem(
          "network-status",
          shouldBeOnline ? "online" : "offline",
        );
      }

      if (shouldBeOnline) {
        setLastOnlineAt(new Date());
      } else {
        setLastOfflineAt(new Date());
      }
    };

    // Subscribe to network changes
    const unsubscribe = network.addListener((online) => {
      if (!simulatedOffline || !isDevelopment) {
        updateNetworkStatus(online);
      }
    });

    // Handle simulated offline changes in development
    if (isDevelopment) {
      const handleSimulatedChange = () => {
        updateNetworkStatus(network.isOnline());
      };
      simulatedOfflineListeners.push(handleSimulatedChange);

      return () => {
        unsubscribe();
        simulatedOfflineListeners = simulatedOfflineListeners.filter(
          (listener) => listener !== handleSimulatedChange,
        );
      };
    }

    return unsubscribe;
  }, [network, storage, isDevelopment]);

  return {
    isOnline,
    lastOnlineAt,
    lastOfflineAt,
    isSimulated,
  };
}
