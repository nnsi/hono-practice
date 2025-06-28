import { createApiClient } from "@packages/auth-core";

import { getApiUrl, logConnectionInfo } from "../utils/getApiUrl";

// API URLの設定
const API_URL = getApiUrl();

// 開発環境では接続情報をログ出力
if (__DEV__) {
  logConnectionInfo();
}

// モバイル用のカスタムfetch
// React Nativeではcredentialsを常にomitにする必要がある
const mobileFetch: typeof fetch = async (url, init) => {
  return fetch(url, {
    ...init,
    credentials: "omit" as RequestCredentials,
  });
};

// APIクライアント
export const apiClient = createApiClient({
  baseUrl: API_URL,
  customFetch: mobileFetch,
  onUnauthorized: () => {
    // 認証エラー時の処理はAuthContextで行う
    console.log("Unauthorized access detected");
  },
  onTokenRefreshed: (token) => {
    // トークンリフレッシュ時の処理はAuthContextで行う
    console.log("Token refreshed");
  },
});
