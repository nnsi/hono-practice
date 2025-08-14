/**
 * イベントバスを抽象化するインターフェース
 * window.dispatchEventやaddEventListenerの実装を差し替え可能にする
 */
export type EventBus = {
  /**
   * イベントを発火する
   * @param eventName イベント名
   * @param detail イベントの詳細データ（オプション）
   */
  emit: (eventName: string, detail?: unknown) => void;

  /**
   * イベントリスナーを登録する
   * @param eventName イベント名
   * @param listener イベントリスナー
   * @returns リスナーを削除する関数
   */
  on: (eventName: string, listener: (event: CustomEvent) => void) => () => void;

  /**
   * 一度だけ実行されるイベントリスナーを登録する
   * @param eventName イベント名
   * @param listener イベントリスナー
   * @returns リスナーを削除する関数
   */
  once: (
    eventName: string,
    listener: (event: CustomEvent) => void,
  ) => () => void;

  /**
   * 全てのイベントリスナーを削除する
   * @param eventName イベント名（指定しない場合は全てのイベント）
   */
  removeAllListeners: (eventName?: string) => void;
};

/**
 * window.dispatchEventを使用したEventBusの実装
 */
export const createWindowEventBus = (): EventBus => {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  return {
    emit: (eventName: string, detail?: unknown) => {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    },

    on: (eventName: string, listener: (event: CustomEvent) => void) => {
      const handler = (event: Event) => {
        if (event instanceof CustomEvent) {
          listener(event);
        }
      };

      // リスナーを管理
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(handler);

      window.addEventListener(eventName, handler);

      return () => {
        window.removeEventListener(eventName, handler);
        listeners.get(eventName)?.delete(handler);
        if (listeners.get(eventName)?.size === 0) {
          listeners.delete(eventName);
        }
      };
    },

    once: (eventName: string, listener: (event: CustomEvent) => void) => {
      const handler = (event: Event) => {
        if (event instanceof CustomEvent) {
          listener(event);
          removeListener();
        }
      };

      const removeListener = () => {
        window.removeEventListener(eventName, handler);
        listeners.get(eventName)?.delete(handler);
        if (listeners.get(eventName)?.size === 0) {
          listeners.delete(eventName);
        }
      };

      // リスナーを管理
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(handler);

      window.addEventListener(eventName, handler);

      return removeListener;
    },

    removeAllListeners: (eventName?: string) => {
      if (eventName) {
        const eventListeners = listeners.get(eventName);
        if (eventListeners) {
          eventListeners.forEach((listener) => {
            window.removeEventListener(eventName, listener);
          });
          listeners.delete(eventName);
        }
      } else {
        listeners.forEach((eventListeners, event) => {
          eventListeners.forEach((listener) => {
            window.removeEventListener(event, listener);
          });
        });
        listeners.clear();
      }
    },
  };
};

/**
 * インメモリEventBusの実装（テスト用）
 */
export const createInMemoryEventBus = (): EventBus => {
  const listeners = new Map<string, Set<(event: CustomEvent) => void>>();

  return {
    emit: (eventName: string, detail?: unknown) => {
      const event = new CustomEvent(eventName, { detail });
      const eventListeners = listeners.get(eventName);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(event));
      }
    },

    on: (eventName: string, listener: (event: CustomEvent) => void) => {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(listener);

      return () => {
        listeners.get(eventName)?.delete(listener);
        if (listeners.get(eventName)?.size === 0) {
          listeners.delete(eventName);
        }
      };
    },

    once: (eventName: string, listener: (event: CustomEvent) => void) => {
      const onceListener = (event: CustomEvent) => {
        listener(event);
        removeListener();
      };

      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(onceListener);

      const removeListener = () => {
        listeners.get(eventName)?.delete(onceListener);
        if (listeners.get(eventName)?.size === 0) {
          listeners.delete(eventName);
        }
      };

      return removeListener;
    },

    removeAllListeners: (eventName?: string) => {
      if (eventName) {
        listeners.delete(eventName);
      } else {
        listeners.clear();
      }
    },
  };
};

/**
 * アプリケーションで使用するイベント名の定義
 */
export const AppEvents = {
  // 認証関連
  TOKEN_REFRESH_NEEDED: "token-refresh-needed",
  TOKEN_REFRESHED: "token-refreshed",
  UNAUTHORIZED: "unauthorized",

  // データ同期関連
  OFFLINE_DATA_UPDATED: "offline-data-updated",
  SYNC_DELETE_SUCCESS: "sync-delete-success",
  SYNC_CREATE_SUCCESS: "sync-create-success",
  SYNC_UPDATE_SUCCESS: "sync-update-success",
  SYNC_OPERATION: "sync-operation",
  SYNC_SUCCESS: "sync-success",
  SYNC_ERROR: "sync-error",

  // API関連
  API_ERROR: "api-error",

  // ネットワーク関連
  ONLINE: "online",
  OFFLINE: "offline",

  // ストレージ関連
  STORAGE: "storage",
} as const;

export type AppEventName = (typeof AppEvents)[keyof typeof AppEvents];
