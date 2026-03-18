import { hc } from "hono/client";

import type { AppType } from "@packages/types/api";
import type { TokenStorage } from "@packages/platform";
import { createAuthenticatedFetch } from "@packages/sync-engine";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

let accessToken: string | null = null;

const tokenStorage: TokenStorage = {
  getToken: () => accessToken,
  setToken: (token: string) => {
    accessToken = token;
  },
  clearToken: () => {
    accessToken = null;
  },
};

export function setToken(token: string) {
  tokenStorage.setToken(token);
}

export function clearToken() {
  tokenStorage.clearToken();
}

export const customFetch = createAuthenticatedFetch({
  tokenStorage,
  apiUrl: API_URL,
});

export const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch,
});

export async function apiLogin(loginId: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login_id: loginId, password }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status === 401)
      throw new Error("IDまたはパスワードが正しくありません");
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("ログインに失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}
