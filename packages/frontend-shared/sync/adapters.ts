import type { TimeProviderAdapter } from "./types";
import type {
  NetworkAdapter,
  StorageAdapter,
  TimerAdapter,
} from "../adapters/types";

// Convert TimerAdapter to TimeProviderAdapter
export function createTimeProviderAdapter<T = unknown>(
  timerAdapter: TimerAdapter<T>,
): TimeProviderAdapter<T> {
  return {
    setInterval: timerAdapter.setInterval,
    clearInterval: timerAdapter.clearInterval,
    now: () => Date.now(),
    getDate: () => new Date(),
    sleep: (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      }),
  };
}

// Storage adapter with sync interface for compatibility
export function createSyncStorageAdapter(storageAdapter: StorageAdapter): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  keys: () => string[];
  clear: () => void;
  addEventListener: (listener: (event: StorageEvent) => void) => () => void;
} {
  // Create sync wrapper around async storage
  const cache = new Map<string, string>();
  let initialized = false;
  const listeners = new Set<(event: StorageEvent) => void>();

  // Initialize cache from storage
  const initialize = async () => {
    if (!initialized) {
      const keys = await storageAdapter.getAllKeys();
      for (const key of keys) {
        const value = await storageAdapter.getItem(key);
        if (value !== null) {
          cache.set(key, value);
        }
      }
      initialized = true;
    }
  };

  // Initialize asynchronously
  initialize();

  const dispatchEvent = (
    key: string | null,
    oldValue: string | null,
    newValue: string | null,
  ) => {
    const event = {
      key,
      oldValue,
      newValue,
      storageArea: null,
      url: typeof window !== "undefined" ? window.location.href : "",
    } as StorageEvent;
    listeners.forEach((listener) => listener(event));
  };

  return {
    getItem: (key: string) => {
      return cache.get(key) ?? null;
    },

    setItem: (key: string, value: string) => {
      const oldValue = cache.get(key) ?? null;
      cache.set(key, value);
      // Save to actual storage asynchronously
      storageAdapter.setItem(key, value).catch(console.error);
      dispatchEvent(key, oldValue, value);
    },

    removeItem: (key: string) => {
      const oldValue = cache.get(key) ?? null;
      cache.delete(key);
      // Remove from actual storage asynchronously
      storageAdapter.removeItem(key).catch(console.error);
      dispatchEvent(key, oldValue, null);
    },

    keys: () => {
      return Array.from(cache.keys());
    },

    clear: () => {
      cache.clear();
      // Clear actual storage asynchronously
      if (storageAdapter.clear) {
        storageAdapter.clear().catch(console.error);
      }
      dispatchEvent(null, null, null);
    },

    addEventListener: (listener: (event: StorageEvent) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// Network status manager adapter
export function createNetworkStatusManager(networkAdapter: NetworkAdapter): {
  isOnline: () => boolean;
  addEventListener: (listener: (isOnline: boolean) => void) => () => void;
} {
  return {
    isOnline: networkAdapter.isOnline,
    addEventListener: networkAdapter.addListener,
  };
}

// Default crypto provider implementation
export function createNullCryptoProvider() {
  return {
    isEncrypted: (_data: string) => false,
    encrypt: async (data: string, _userId?: string) => data,
    decrypt: async (data: string, _userId?: string) => data,
    clearCache: () => {},
  };
}
