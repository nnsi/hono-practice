import { createMemoryTokenStore } from "@packages/frontend-shared";

import type { StorageProvider } from "@frontend/services/abstractions";
import type { TokenStorage } from "@packages/frontend-shared/types";

/**
 * LocalStorageベースのトークンストレージを作成
 * クロージャを使用して状態を管理
 */
function createLocalStorageTokenStore(storage: StorageProvider): TokenStorage {
  const storageKey = "actiko-access-token";

  return {
    getToken(): string | null {
      return storage.getItem(storageKey);
    },

    setToken(token: string | null): void {
      if (token) {
        storage.setItem(storageKey, token);
      } else {
        storage.removeItem(storageKey);
      }
    },

    clearToken(): void {
      storage.removeItem(storageKey);
    },
  };
}

/**
 * トークンストアを作成するファクトリー関数
 * @param storage StorageProvider（省略時はメモリストレージ）
 * @returns TokenStorage
 */
export function createTokenStore(storage?: StorageProvider): TokenStorage {
  if (storage) {
    return createLocalStorageTokenStore(storage);
  }
  return createMemoryTokenStore();
}

// デフォルトのトークンストア（互換性のため）
export { tokenStore } from "@packages/frontend-shared";
