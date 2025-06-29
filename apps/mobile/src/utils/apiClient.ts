import { DeviceEventEmitter } from "react-native";

import { createApiClient } from "@packages/auth-core";

import { getApiUrl, logConnectionInfo } from "./getApiUrl";

// API URLの設定
const API_URL = getApiUrl();

// 開発環境では接続情報をログ出力
if (__DEV__) {
  logConnectionInfo();
}

const eventEmitter = DeviceEventEmitter;

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
    // 認証エラー時の処理
    console.log("Unauthorized access detected");
    eventEmitter.emit("unauthorized", "Authentication failed");
  },
  onTokenRefreshed: (token) => {
    // トークンリフレッシュ時の処理
    console.log("Token refreshed");
    eventEmitter.emit("token-refreshed", token);

    // window.dispatchEventも発火（AuthContextとの互換性のため）
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("token-refreshed", { detail: token }),
      );
    }
  },
});

export { eventEmitter as apiEventEmitter };
