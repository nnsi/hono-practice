import type { NetworkAdapter, StorageAdapter } from "@packages/platform";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { reportError } from "../utils/errorReporter";

let cachedOnline = true;
let forcedOffline = false;
const onlineListeners = new Set<() => void>();

function effectiveOnline(): boolean {
  return !forcedOffline && cachedOnline;
}

function fireOnlineIfTransitioned(prev: boolean) {
  if (!prev && effectiveOnline()) {
    for (const cb of onlineListeners) cb();
  }
}

NetInfo.addEventListener((state) => {
  const prev = effectiveOnline();
  cachedOnline = !!state.isConnected;
  fireOnlineIfTransitioned(prev);
});

export const rnNetworkAdapter: NetworkAdapter = {
  isOnline: () => effectiveOnline(),
  onOnline: (callback) => {
    onlineListeners.add(callback);
    return () => {
      onlineListeners.delete(callback);
    };
  },
};

// 強制オフライン制御 (E2E / dev 向け)。
// EXPO_PUBLIC_E2E_MODE / __DEV__ で gating した UI から呼ばれる。本番ビルドでは
// この関数を呼ぶ経路がそもそも生成されないので、製品挙動には影響しない。
export function setForcedOffline(value: boolean): void {
  const prev = effectiveOnline();
  forcedOffline = value;
  fireOnlineIfTransitioned(prev);
}

export function isForcedOffline(): boolean {
  return forcedOffline;
}

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
