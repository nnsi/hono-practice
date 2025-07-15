/**
 * ストレージ操作を抽象化するインターフェース
 * localStorageやsessionStorageなどの実装を差し替え可能にする
 */
export type StorageProvider = {
  /**
   * 指定されたキーの値を取得
   * @param key ストレージキー
   * @returns 値（存在しない場合はnull）
   */
  getItem: (key: string) => string | null;

  /**
   * 指定されたキーに値を保存
   * @param key ストレージキー
   * @param value 保存する値
   */
  setItem: (key: string, value: string) => void;

  /**
   * 指定されたキーの値を削除
   * @param key ストレージキー
   */
  removeItem: (key: string) => void;

  /**
   * 全てのキーを取得
   * @returns キーの配列
   */
  keys: () => string[];

  /**
   * ストレージをクリア
   */
  clear: () => void;

  /**
   * ストレージイベントのリスナーを追加
   * @param listener イベントリスナー
   * @returns リスナーを削除する関数
   */
  addEventListener: (listener: (event: StorageEvent) => void) => () => void;
};

/**
 * localStorageの実装
 */
export const createLocalStorageProvider = (): StorageProvider => {
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },

    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    },

    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error("Failed to remove from localStorage:", error);
      }
    },

    keys: () => {
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    },

    clear: () => {
      try {
        localStorage.clear();
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
      }
    },

    addEventListener: (listener: (event: StorageEvent) => void) => {
      const handler = (event: StorageEvent) => {
        listener(event);
      };

      window.addEventListener("storage", handler);

      return () => {
        window.removeEventListener("storage", handler);
      };
    },
  };
};

/**
 * インメモリストレージの実装（テスト用）
 */
export const createInMemoryStorageProvider = (): StorageProvider => {
  const storage = new Map<string, string>();
  const listeners = new Set<(event: StorageEvent) => void>();

  const dispatchEvent = (
    key: string | null,
    oldValue: string | null,
    newValue: string | null,
  ) => {
    const event = new StorageEvent("storage", {
      key,
      oldValue,
      newValue,
      storageArea: storage as any,
      url: window.location.href,
    });

    listeners.forEach((listener) => listener(event));
  };

  return {
    getItem: (key: string) => {
      return storage.get(key) ?? null;
    },

    setItem: (key: string, value: string) => {
      const oldValue = storage.get(key) ?? null;
      storage.set(key, value);
      dispatchEvent(key, oldValue, value);
    },

    removeItem: (key: string) => {
      const oldValue = storage.get(key) ?? null;
      const deleted = storage.delete(key);
      if (deleted) {
        dispatchEvent(key, oldValue, null);
      }
    },

    keys: () => {
      return Array.from(storage.keys());
    },

    clear: () => {
      storage.clear();
      dispatchEvent(null, null, null);
    },

    addEventListener: (listener: (event: StorageEvent) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
