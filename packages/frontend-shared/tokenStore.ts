import type { TokenStorage } from "./types";

/**
 * メモリベースのトークンストレージを作成
 * クロージャを使用して状態を管理
 */
export function createMemoryTokenStore(): TokenStorage {
  let token: string | null = null;

  return {
    getToken(): string | null {
      return token;
    },

    setToken(newToken: string | null): void {
      token = newToken;
    },

    clearToken(): void {
      token = null;
    },
  };
}

// グローバルインスタンス
export const tokenStore = createMemoryTokenStore();
