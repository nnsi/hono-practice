import {
  createReactNativeNetworkAdapter,
  createReactNativeStorageAdapter,
} from "@packages/frontend-shared/adapters/react-native";
import { createUseNetworkStatus } from "@packages/frontend-shared/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// React Native環境用のadapterをシングルトンとして作成
const network = createReactNativeNetworkAdapter(NetInfo);
const storage = createReactNativeStorageAdapter(AsyncStorage);

export function useNetworkStatus() {
  const result = createUseNetworkStatus({
    network,
    storage,
  });

  // 既存のコードとの互換性のため、isConnectedも返す
  // React Nativeでは、isOnlineとisConnectedは同じ値として扱う
  return {
    isOnline: result.isOnline,
    isConnected: result.isOnline,
    lastOnlineAt: result.lastOnlineAt,
    lastOfflineAt: result.lastOfflineAt,
  };
}
