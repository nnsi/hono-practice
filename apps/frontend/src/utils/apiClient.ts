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

const processQueue = (error: Error | null = null) => {
  failedRequestsQueue.forEach((callback) => {
    if (error) {
      // リフレッシュに失敗した場合、全てのリクエストをエラーとして処理
      window.dispatchEvent(
        new CustomEvent("unauthorized", { detail: error.message }),
      );
    } else {
      // リフレッシュに成功した場合、保留中のリクエストを再試行
      callback();
    }
  });
  failedRequestsQueue = [];
};

const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_URL}auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data.token;
  } catch (error) {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    throw error;
  }
};

const customFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (res.status === 204) return new Response(null, { status: 204 });

    const json = await res.json();

    if (res.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // アクセストークンの更新を試みる
          await refreshAccessToken();
          isRefreshing = false;
          processQueue();

          // 更新されたトークンで元のリクエストを再試行
          return await customFetch(input, init);
        } catch (error) {
          isRefreshing = false;
          processQueue(error as Error);
          throw error;
        }
      } else {
        // 既にリフレッシュ中の場合は、キューに追加
        return new Promise((resolve) => {
          failedRequestsQueue.push(async () => {
            try {
              const result = await customFetch(input, init);
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
  } catch (error) {
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
