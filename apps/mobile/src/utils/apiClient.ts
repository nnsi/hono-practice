import { hc } from "hono/client";

import type { AppType } from "@packages/types/api";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REQUEST_TIMEOUT_MS = 15_000;

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // Expo Go / dev client: use the same host IP that Metro bundler uses
  if (__DEV__) {
    const debuggerHost = Constants.expoGoConfig?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(":")[0];
      return `http://${host}:3456`;
    }
    return "http://localhost:3456";
  }
  // 本番ビルドで EXPO_PUBLIC_API_URL が未設定 → 起動時にクラッシュさせて気付けるようにする
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Production builds require this environment variable.",
  );
}

const API_URL = resolveApiUrl();

export function getApiUrl(): string {
  return API_URL;
}

let accessToken: string | null = null;

export function setToken(token: string) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

const REFRESH_TOKEN_KEY = "actiko-refresh-token";
const isWeb = Platform.OS === "web";

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(REFRESH_TOKEN_KEY);
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const rt = await getRefreshToken();
      if (!rt) return null;
      const res = await fetchWithTimeout(`${API_URL}/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rt}`,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      accessToken = data.token;
      if (data.refreshToken) await setRefreshToken(data.refreshToken);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = init?.signal;
  // 呼び出し元が既にAbortControllerを渡している場合はそちらも尊重
  if (existingSignal) {
    existingSignal.addEventListener("abort", () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

export const customFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res = await fetchWithTimeout(input, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetchWithTimeout(input, { ...init, headers });
    }
  }
  return res;
};

// Hono RPC client — type-safe API access
export const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch,
});

// Auth APIs (manual — these manage token state)
export async function apiLogin(loginId: string, password: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiRegister(
  name: string,
  loginId: string,
  password: string,
) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, loginId, password }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("登録に失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiGetMe() {
  const res = await customFetch(`${API_URL}/user/me`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function apiRefreshToken() {
  const rt = await getRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const res = await fetchWithTimeout(`${API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${rt}`,
    },
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiLogout() {
  try {
    await customFetch(`${API_URL}/auth/logout`, { method: "POST" });
  } catch {
    // Ignore logout errors - clear local state regardless
  }
  clearToken();
  await clearRefreshToken();
}

// Google auth
export async function apiGoogleLogin(credential: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("Googleログインに失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiGoogleLink(credential: string) {
  const res = await customFetch(`${API_URL}/auth/google/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new Error("このGoogleアカウントは別のユーザーに連携済みです");
    throw new Error("Google連携に失敗しました");
  }
}
