import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  NetworkAdapter,
  StorageAdapter,
} from "@packages/domain/sync/platformAdapters";

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
  const keys = await AsyncStorage.getAllKeys();
  const items = await AsyncStorage.multiGet(
    keys.filter((k) => k.startsWith("actiko-")),
  );
  for (const [key, value] of items) {
    if (value !== null) cache.set(key, value);
  }
  cacheLoaded = true;
}

export function isStorageCacheLoaded(): boolean {
  return cacheLoaded;
}

export const rnStorageAdapter: StorageAdapter = {
  getItem: (key) => cache.get(key) ?? null,
  setItem: (key, value) => {
    cache.set(key, value);
    AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    cache.delete(key);
    AsyncStorage.removeItem(key);
  },
};
