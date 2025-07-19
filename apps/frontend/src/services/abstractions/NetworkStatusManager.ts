/**
 * ネットワーク状態を管理するインターフェース
 * navigator.onLineやonline/offlineイベントの実装を差し替え可能にする
 */
export type NetworkStatusManager = {
  /**
   * 現在のネットワーク状態を取得
   * @returns オンラインの場合true、オフラインの場合false
   */
  isOnline: () => boolean;

  /**
   * ネットワーク状態変更のリスナーを登録
   * @param listener 状態変更時に呼ばれるコールバック
   * @returns リスナーを削除する関数
   */
  addListener: (listener: (isOnline: boolean) => void) => () => void;

  /**
   * ネットワーク状態を手動で設定（テスト用）
   * @param isOnline 設定するネットワーク状態
   */
  setOnline?: (isOnline: boolean) => void;
};

/**
 * ブラウザのnavigator.onLineを使用した実装
 */
export const createBrowserNetworkStatusManager = (): NetworkStatusManager => {
  const listeners = new Set<(isOnline: boolean) => void>();

  const notifyListeners = (isOnline: boolean) => {
    listeners.forEach((listener) => listener(isOnline));
  };

  const handleOnline = () => {
    notifyListeners(true);
  };

  const handleOffline = () => {
    notifyListeners(false);
  };

  // イベントリスナーを一度だけ登録
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return {
    isOnline: () => navigator.onLine,

    addListener: (listener: (isOnline: boolean) => void) => {
      listeners.add(listener);

      // 登録時に現在の状態を通知
      listener(navigator.onLine);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * テスト用のモックネットワーク状態マネージャー
 */
export const createMockNetworkStatusManager = (
  initialState = true,
): NetworkStatusManager => {
  let online = initialState;
  const listeners = new Set<(isOnline: boolean) => void>();

  const notifyListeners = () => {
    listeners.forEach((listener) => listener(online));
  };

  return {
    isOnline: () => online,

    addListener: (listener: (isOnline: boolean) => void) => {
      listeners.add(listener);

      // 登録時に現在の状態を通知
      listener(online);

      return () => {
        listeners.delete(listener);
      };
    },

    setOnline: (isOnline: boolean) => {
      if (online !== isOnline) {
        online = isOnline;
        notifyListeners();
      }
    },
  };
};

/**
 * 開発環境で使用する模擬オフライン機能付きマネージャー
 */
export const createSimulatedNetworkStatusManager = (): NetworkStatusManager & {
  setSimulatedOffline: (offline: boolean) => void;
  isSimulated: () => boolean;
} => {
  let simulatedOffline = false;
  const listeners = new Set<(isOnline: boolean) => void>();

  const getCurrentState = () => {
    return simulatedOffline ? false : navigator.onLine;
  };

  const notifyListeners = () => {
    const isOnline = getCurrentState();
    listeners.forEach((listener) => listener(isOnline));
  };

  const handleOnline = () => {
    if (!simulatedOffline) {
      notifyListeners();
    }
  };

  const handleOffline = () => {
    notifyListeners();
  };

  // イベントリスナーを一度だけ登録
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return {
    isOnline: getCurrentState,

    addListener: (listener: (isOnline: boolean) => void) => {
      listeners.add(listener);

      // 登録時に現在の状態を通知
      listener(getCurrentState());

      return () => {
        listeners.delete(listener);
      };
    },

    setSimulatedOffline: (offline: boolean) => {
      if (simulatedOffline !== offline) {
        simulatedOffline = offline;
        notifyListeners();
      }
    },

    isSimulated: () => simulatedOffline,
  };
};
