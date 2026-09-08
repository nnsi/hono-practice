import type { OnlineRetryAdapter } from "@packages/auth-client";
import NetInfo from "@react-native-community/netinfo";

export const mobileOnlineRetryAdapter: OnlineRetryAdapter = {
  registerOnlineRetry(handler) {
    let disconnected = false;
    let active = true;
    const unsubscribe = NetInfo.addEventListener((info) => {
      if (!active) return;
      if (info.isConnected === false) disconnected = true;
      // 初回 connected や unknown → connected は復帰イベントにしない。
      if (info.isConnected === true && disconnected) {
        disconnected = false;
        handler();
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  },
};
