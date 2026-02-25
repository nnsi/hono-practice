import type { NetworkAdapter, StorageAdapter } from "@packages/domain/sync/platformAdapters";

export const webNetworkAdapter: NetworkAdapter = {
  isOnline: () => navigator.onLine,
  onOnline: (callback) => {
    window.addEventListener("online", callback);
    return () => window.removeEventListener("online", callback);
  },
};

export const webStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
