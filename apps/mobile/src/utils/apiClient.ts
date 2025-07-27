import { createApiClient, tokenStore } from "@packages/frontend-shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { eventBus } from "./eventBus";
import { getApiUrl, logConnectionInfo } from "./getApiUrl";

// API URLの設定
const API_URL = getApiUrl();

// 開発環境では接続情報をログ出力
if (__DEV__) {
  logConnectionInfo();
  console.log("API Client initialized with URL:", API_URL);
}

// リフレッシュトークンのキューイング用
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

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

    // 401エラーの場合、モバイル用のトークンリフレッシュ処理
    if (response.status === 401 && !url.toString().includes("/auth/")) {
      // 既にリフレッシュ中の場合は待機
      if (isRefreshing) {
        await refreshPromise;
        // リフレッシュ後の新しいトークンで再試行
        const newToken = tokenStore.getToken();
        if (newToken) {
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `Bearer ${newToken}`);
          return fetch(url, {
            ...init,
            headers,
            credentials: "omit" as RequestCredentials,
          });
        }
      }

      // リフレッシュを開始
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshToken = await AsyncStorage.getItem("refreshToken");
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          const refreshResponse = await fetch(`${API_URL}/auth/token`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
            credentials: "omit" as RequestCredentials,
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();

            // 新しいトークンを保存
            tokenStore.setToken(data.token);
            await AsyncStorage.setItem("accessToken", data.token);
            await AsyncStorage.setItem("refreshToken", data.refreshToken);

            // 新しいトークンでリトライ
            const headers = new Headers(init?.headers);
            headers.set("Authorization", `Bearer ${data.token}`);
            const retryResponse = await fetch(url, {
              ...init,
              headers,
              credentials: "omit" as RequestCredentials,
            });

            // リトライ結果を保存して後で返す
            Object.defineProperty(response, "_retryResponse", {
              value: retryResponse,
              writable: false,
            });
          } else {
            // リフレッシュ失敗
            tokenStore.clearToken();
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            eventBus.emit("unauthorized");
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          tokenStore.clearToken();
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");
          eventBus.emit("unauthorized");
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      await refreshPromise;

      // リトライ結果があれば返す
      if ((response as any)._retryResponse) {
        return (response as any)._retryResponse;
      }
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
