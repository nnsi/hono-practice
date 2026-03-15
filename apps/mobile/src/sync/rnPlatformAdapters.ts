import type { NetworkAdapter, StorageAdapter } from "@packages/platform";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { reportError } from "../utils/errorReporter";

let cachedOnline = true;
NetInfo.addEventListener((state) => {
  cachedOnline = !!state.isConnected;
});

export const rnNetworkAdapter: NetworkAdapter = {
  isOnline: () => cachedOnline,
  onOnline: (callback) => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) callback();
    });
    return unsub;
  },
};

// Note: AsyncStorage is async, but the StorageAdapter interface expects sync.
// We use a sync cache backed by AsyncStorage for the sync engine.
const cache = new Map<string, string>();
let cacheLoaded = false;

export async function loadStorageCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(
      keys.filter((k) => k.startsWith("actiko-")),
    );
    for (const [key, value] of items) {
      if (value !== null) cache.set(key, value);
    }
  } catch (err: unknown) {
    handleStorageError(err);
  }
  cacheLoaded = true;
}

export function isStorageCacheLoaded(): boolean {
  return cacheLoaded;
}

const handleStorageError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  reportError({ errorType: "storage_error", message, stack });
};

export const rnStorageAdapter: StorageAdapter = {
  getItem: (key) => cache.get(key) ?? null,
  setItem: (key, value) => {
    cache.set(key, value);
    AsyncStorage.setItem(key, value).catch(handleStorageError);
  },
  removeItem: (key) => {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(handleStorageError);
  },
};
