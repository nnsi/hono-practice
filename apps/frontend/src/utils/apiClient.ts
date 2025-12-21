import { hc } from "hono/client";

import type { AppType } from "@backend/app";
import type { ApiClientConfig } from "@frontend/services/abstractions";
import { AppEvents } from "@frontend/services/abstractions";
import { createLocalStorageProvider } from "@frontend/services/abstractions/StorageProvider";
import { getWebApiUrl } from "@packages/frontend-shared/utils/apiUrl";

import { createTokenStore } from "./createTokenStore";
import { tokenStore } from "./tokenStore";

const API_URL = getWebApiUrl({
  isDevelopment: import.meta.env.MODE === "development",
  apiUrl: import.meta.env.VITE_API_URL,
  apiPort: import.meta.env.VITE_API_PORT || "3456",
});

/**
 * APIクライアントを作成するファクトリー関数
 */
export function createApiClient(config?: Partial<ApiClientConfig>) {
  const baseUrl = config?.baseUrl || API_URL;
  const httpClient = config?.httpClient || {
    fetch: (...args) => fetch(...args),
  };
  const tokenManager = config?.tokenManager || tokenStore;
  const eventBus = config?.eventBus || {
    emit: (eventName: string, detail?: unknown) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    },
  };

  // リフレッシュトークンを使用中かどうかのフラグ
  let isRefreshing = false;
  // 保留中のリクエストのキュー
  let failedRequestsQueue: Array<() => void> = [];

  const processQueue = (error: Error | null = null, isTokenRefresh = false) => {
    failedRequestsQueue.forEach((callback) => {
      if (error && isTokenRefresh) {
        // リフレッシュに失敗した場合のみunauthorizedを発火
        eventBus.emit(AppEvents.UNAUTHORIZED, error.message);
      } else {
        callback();
      }
    });
    failedRequestsQueue = [];
  };

  const refreshAccessToken = async () => {
    const response = await httpClient.fetch(`${baseUrl}auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Keep credentials for refresh token cookie
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    tokenManager.setToken(data.token);

    // Dispatch token refresh event
    eventBus.emit(AppEvents.TOKEN_REFRESHED, data.token);

    return;
  };

  const customFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
    isRetry?: boolean,
  ): Promise<Response> => {
    try {
      const token = tokenManager.getToken();
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Include credentials for auth endpoints and user creation (for refresh token cookie)
      const url = typeof input === "string" ? input : input.toString();
      const includeCredentials =
        url.includes("/auth/") || url.includes("/user");

      const res = await httpClient.fetch(input, {
        ...init,
        headers,
        credentials: includeCredentials ? "include" : "omit",
      });

      if (res.status === 204) return new Response(null, { status: 204 });

      const json = await res.json();

      if (res.status === 401) {
        // E2E環境では自動リフレッシュをスキップ
        const isE2E = import.meta.env.VITE_E2E_TEST === "true";
        if (isE2E) {
          return new Response(JSON.stringify(json), { status: 401 });
        }

        if (isRetry) {
          return new Response(JSON.stringify(json), { status: 401 });
        }
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // アクセストークンの更新を試みる
            await refreshAccessToken();
            isRefreshing = false;
            processQueue(undefined, true); // トークンリフレッシュ成功時

            // 1回だけリトライ
            return await customFetch(input, init, true);
          } catch (error) {
            isRefreshing = false;
            processQueue(error as Error, true); // トークンリフレッシュ失敗時のみunauthorized発火
            throw error;
          }
        } else {
          // 既にリフレッシュ中の場合は、キューに追加
          return new Promise((resolve) => {
            failedRequestsQueue.push(async () => {
              try {
                const result = await customFetch(input, init, true);
                resolve(result);
              } catch (_error) {
                resolve(new Response(JSON.stringify(json), { status: 401 }));
              }
            });
          });
        }
      }

      if (res.status === 400 || res.status > 401) {
        eventBus.emit(AppEvents.API_ERROR, json.message);
        throw Error(json.message);
      }

      return new Response(JSON.stringify(json), {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // 401や未認証系のエラーはapi-errorを発火しない
      const msg = error instanceof Error ? error.message : "";
      if (
        msg.includes("401") ||
        msg.includes("unauthorized") ||
        msg.includes("refresh token not found") ||
        msg.includes("invalid refresh token") ||
        msg.includes("Failed to refresh token")
      ) {
        throw error;
      }
      if (error instanceof Error) {
        eventBus.emit(AppEvents.API_ERROR, error.message);
      }
      throw error;
    }
  };

  return hc<AppType>(baseUrl, {
    init: {
      mode: "cors",
    },
    fetch: customFetch,
  });
}

// デフォルトのAPIクライアント（互換性保持のため）
// E2E環境ではlocalStorageベースのtokenStoreを使用
const isE2E = import.meta.env.VITE_E2E_TEST === "true";
const defaultTokenStore = isE2E
  ? createTokenStore(createLocalStorageProvider())
  : tokenStore;

export const apiClient = createApiClient({ tokenManager: defaultTokenStore });
