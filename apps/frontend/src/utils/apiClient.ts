import { hc } from "hono/client";

import type { AppType } from "@backend/app";

const API_URL =
  import.meta.env.MODE === "development"
    ? `http://${document.domain}:3456/`
    : import.meta.env.VITE_API_URL;

// リフレッシュトークンを使用中かどうかのフラグ
let isRefreshing = false;
// 保留中のリクエストのキュー
let failedRequestsQueue: Array<() => void> = [];

const processQueue = (error: Error | null = null, isTokenRefresh = false) => {
  failedRequestsQueue.forEach((callback) => {
    if (error && isTokenRefresh) {
      // リフレッシュに失敗した場合のみunauthorizedを発火
      window.dispatchEvent(
        new CustomEvent("unauthorized", { detail: error.message }),
      );
    } else {
      callback();
    }
  });
  failedRequestsQueue = [];
};

const refreshAccessToken = async () => {
  const response = await fetch(`${API_URL}auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return;
};

const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  isRetry?: boolean,
): Promise<Response> => {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        "Content-Type": "application/json",
      },
      credentials: "include",
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
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: json.message }),
      );
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
      window.dispatchEvent(
        new CustomEvent("api-error", { detail: error.message }),
      );
    }
    throw error;
  }
};

export const apiClient = hc<AppType>(API_URL, {
  init: {
    mode: "cors",
    credentials: "include",
  },
  fetch: customFetch,
});
