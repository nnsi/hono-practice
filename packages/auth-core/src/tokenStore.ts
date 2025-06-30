import type { TokenStorage } from "./types";

/**
 * シンプルなメモリベースのトークンストレージ
 * プラットフォーム共通で使用可能
 */
export class MemoryTokenStore implements TokenStorage {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }
}

// グローバルインスタンス
export const tokenStore = new MemoryTokenStore();
