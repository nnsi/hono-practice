import { hc } from "hono/client";

import { tokenStore } from "./tokenStore";

import type { AppType } from "@backend/app";

type ApiClientConfig = {
  baseUrl: string;
  onUnauthorized?: () => void;
  onTokenRefreshed?: (token: string) => void;
  customFetch?: typeof fetch;
};

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, onUnauthorized, onTokenRefreshed } = config;

  // リフレッシュトークンのキューイング用
  let isRefreshing = false;
  let refreshPromise: Promise<void> | null = null;

  const customFetch: typeof fetch = async (url, init) => {
    const isAuthEndpoint = url.toString().includes("/auth/");
    const isLogoutEndpoint = url.toString().includes("/auth/logout");
    const token = tokenStore.getToken();

    const headers = new Headers(init?.headers);

    // ログアウトエンドポイントは認証が必要
    if (token && (!isAuthEndpoint || isLogoutEndpoint)) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await (config.customFetch || fetch)(url, {
      ...init,
      headers,
      // 認証エンドポイントのみcredentials: include（Cookie用）
      credentials: isAuthEndpoint ? "include" : "omit",
    });

    // 401エラーの場合、トークンをリフレッシュしてリトライ
    if (response.status === 401 && !isAuthEndpoint) {
      // 既にリフレッシュ中の場合は待機
      if (isRefreshing) {
        await refreshPromise;
        // リフレッシュ後の新しいトークンで再試行
        const newToken = tokenStore.getToken();
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          return (config.customFetch || fetch)(url, {
            ...init,
            headers,
            credentials: "omit",
          });
        }
      }

      // リフレッシュを開始
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshResponse = await (config.customFetch || fetch)(
            `${baseUrl}/auth/refresh`,
            {
              method: "POST",
              credentials: "include",
            },
          );

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            tokenStore.setToken(data.token);

            // コールバックを呼び出し
            onTokenRefreshed?.(data.token);

            // 新しいトークンでリトライ
            headers.set("Authorization", `Bearer ${data.token}`);
            const retryResponse = await (config.customFetch || fetch)(url, {
              ...init,
              headers,
              credentials: "omit",
            });

            // リトライ結果を保存して後で返す
            Object.defineProperty(response, "_retryResponse", {
              value: retryResponse,
              writable: false,
            });
          } else {
            // リフレッシュ失敗
            tokenStore.clearToken();
            onUnauthorized?.();
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          tokenStore.clearToken();
          onUnauthorized?.();
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
  };

  return hc<AppType>(baseUrl, {
    fetch: customFetch,
  });
}
