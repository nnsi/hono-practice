import { useEffect, useState } from "react";

export type NetworkStatus = {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  isSimulated?: boolean; // 開発環境での模擬オフライン状態
};

// 開発環境でのオフライン状態を管理するためのグローバル変数
let simulatedOffline = false;
let simulatedOfflineListeners: Array<() => void> = [];

export function setSimulatedOffline(offline: boolean) {
  simulatedOffline = offline;
  simulatedOfflineListeners.forEach((listener) => listener());
}

export function getSimulatedOffline(): boolean {
  return simulatedOffline;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => {
    const isDevelopment = import.meta.env.DEV;
    const shouldBeOnline =
      isDevelopment && simulatedOffline ? false : navigator.onLine;
    // 初期値もlocalStorageに保存
    localStorage.setItem(
      "network-status",
      shouldBeOnline ? "online" : "offline",
    );
    return shouldBeOnline;
  });
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    const updateNetworkStatus = () => {
      const isActuallyOnline = navigator.onLine;
      const isDevelopment = import.meta.env.DEV;

      // 開発環境では模擬オフライン状態を優先
      const shouldBeOnline =
        isDevelopment && simulatedOffline ? false : isActuallyOnline;

      setIsOnline(shouldBeOnline);
      setIsSimulated(isDevelopment && simulatedOffline);

      // localStorageに状態を保存（qp関数で参照するため）
      localStorage.setItem(
        "network-status",
        shouldBeOnline ? "online" : "offline",
      );

      if (shouldBeOnline) {
        setLastOnlineAt(new Date());
      } else {
        setLastOfflineAt(new Date());
      }
    };

    const handleOnline = () => {
      if (!simulatedOffline) {
        updateNetworkStatus();
      }
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 模擬オフライン状態の変更を監視
    simulatedOfflineListeners.push(updateNetworkStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      simulatedOfflineListeners = simulatedOfflineListeners.filter(
        (listener) => listener !== updateNetworkStatus,
      );
    };
  }, []);

  return {
    isOnline,
    lastOnlineAt,
    lastOfflineAt,
    isSimulated,
  };
}
