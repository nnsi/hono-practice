import { useEffect, useState } from "react";

import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
      setIsConnected(state.isInternetReachable ?? false);
    });

    // 初期状態を取得
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
      setIsConnected(state.isInternetReachable ?? false);
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    isConnected,
  };
}
