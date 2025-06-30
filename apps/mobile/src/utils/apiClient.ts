import { createApiClient } from "@packages/auth-core";

import { eventBus } from "./eventBus";
import { getApiUrl, logConnectionInfo } from "./getApiUrl";

// API URLの設定
const API_URL = getApiUrl();

// 開発環境では接続情報をログ出力
if (__DEV__) {
  logConnectionInfo();
  console.log("API Client initialized with URL:", API_URL);
}

// モバイル用のカスタムfetch
// React Nativeではcredentialsを常にomitにする必要がある
const mobileFetch: typeof fetch = async (url, init) => {
  if (__DEV__) {
    console.log("Fetching:", url, {
      method: init?.method || "GET",
      headers: init?.headers,
    });
  }

  try {
    const response = await fetch(url, {
      ...init,
      credentials: "omit" as RequestCredentials,
    });

    if (__DEV__) {
      console.log("Fetch response:", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response;
  } catch (error) {
    if (__DEV__) {
      console.error("Fetch error:", {
        url,
        error: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
};

// APIクライアント
export const apiClient = createApiClient({
  baseUrl: API_URL,
  customFetch: mobileFetch,
  onUnauthorized: () => {
    // 認証エラー時の処理
    console.log("Unauthorized access detected");
    eventBus.emit("unauthorized");
  },
  onTokenRefreshed: (token) => {
    // トークンリフレッシュ時の処理
    console.log("Token refreshed");
    eventBus.emit("token-refreshed", token);
  },
});
