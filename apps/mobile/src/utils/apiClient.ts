import { hc } from "hono/client";

import { DeviceEventEmitter } from "react-native";

import { getApiUrl } from "./getApiUrl";
import { tokenStore } from "./tokenStore";

import type { AppType } from "@backend/app";

const API_URL = getApiUrl();

const eventEmitter = DeviceEventEmitter;

// リフレッシュトークンを使用中かどうかのフラグ
let isRefreshing = false;
// 保留中のリクエストのキュー
let failedRequestsQueue: Array<() => void> = [];

const processQueue = (error: Error | null = null, isTokenRefresh = false) => {
  failedRequestsQueue.forEach((callback) => {
    if (error && isTokenRefresh) {
      // リフレッシュに失敗した場合のみunauthorizedを発火
      eventEmitter.emit("unauthorized", error.message);
    } else {
      callback();
    }
  });
  failedRequestsQueue = [];
};

const refreshAccessToken = async () => {
  const response = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  await tokenStore.setToken(data.token);

  // Dispatch token refresh event
  eventEmitter.emit("token-refreshed", data.token);

  return;
};

const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  isRetry?: boolean,
): Promise<Response> => {
  try {
    const token = await tokenStore.getToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Only include credentials for auth endpoints (for refresh token cookie)
    const url = typeof input === "string" ? input : input.toString();
    const includeCredentials = url.includes("/auth/");

    const res = await fetch(input, {
      ...init,
      headers,
      credentials: includeCredentials ? "include" : "omit",
    });

    if (res.status === 204) return new Response(null, { status: 204 });

    const json = await res.json();

    if (res.status === 401) {
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
            } catch (error) {
              resolve(new Response(JSON.stringify(json), { status: 401 }));
            }
          });
        });
      }
    }

    if (res.status === 400 || res.status > 401) {
      eventEmitter.emit("api-error", json.message);
      throw Error(json.message);
    }

    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    // 401や未認証系のエラーはapi-errorを発火しない
    const msg = error?.message || "";
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
      eventEmitter.emit("api-error", error.message);
    }
    throw error;
  }
};

export const apiClient = hc<AppType>(API_URL, {
  init: {
    mode: "cors",
  },
  fetch: customFetch,
});

export { eventEmitter as apiEventEmitter };
