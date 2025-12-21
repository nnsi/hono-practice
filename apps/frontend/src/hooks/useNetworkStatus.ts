import { useMemo } from "react";

import type { NetworkStatusManager } from "@frontend/services/abstractions";
import {
  createWebNetworkAdapter,
  createWebStorageAdapter,
} from "@packages/frontend-shared/adapters";
import type { UseNetworkStatusReturn } from "@packages/frontend-shared/hooks";
import {
  createUseNetworkStatus,
  getSimulatedOffline as getSharedSimulatedOffline,
  setSimulatedOffline as setSharedSimulatedOffline,
} from "@packages/frontend-shared/hooks";

export type NetworkStatus = UseNetworkStatusReturn;

// Web環境用のadaptersをシングルトンとして作成
const network = createWebNetworkAdapter();
const storage = createWebStorageAdapter();

// 既存のコードとの互換性のため、元の関数名でエクスポート
export const setSimulatedOffline = setSharedSimulatedOffline;
export const getSimulatedOffline = getSharedSimulatedOffline;

// NetworkStatusManagerを使用するバージョンのhook（既存との互換性のため）
export function useNetworkStatusWithManager(
  networkStatusManager: NetworkStatusManager,
  storageAdapter?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  },
): NetworkStatus {
  // NetworkStatusManagerのインターフェースをNetworkAdapterにラップ
  const networkAdapter = useMemo(
    () => ({
      isOnline: () => networkStatusManager.isOnline(),
      addListener: (callback: (isOnline: boolean) => void) =>
        networkStatusManager.addListener(callback),
    }),
    [networkStatusManager],
  );

  // storageAdapterがある場合はそれを使用、なければデフォルトのWebStorageAdapterを使用
  const storageToUse = useMemo(() => {
    if (storageAdapter) {
      return {
        getItem: async (key: string) => storageAdapter.getItem(key),
        setItem: async (key: string, value: string) =>
          storageAdapter.setItem(key, value),
        removeItem: async () => {},
        getAllKeys: async () => [],
        clear: async () => {},
      };
    }
    return storage;
  }, [storageAdapter]);

  return createUseNetworkStatus({
    network: networkAdapter,
    storage: storageToUse,
  });
}

export function useNetworkStatus(): NetworkStatus {
  return createUseNetworkStatus({
    network,
    storage,
  });
}
