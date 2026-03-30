import { hc } from "hono/client";

import { trackServerTimeFromResponse } from "@packages/sync-engine";
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
let authExpiredCallback: (() => void) | null = null;

export function setOnAuthExpired(cb: (() => void) | null): void {
  authExpiredCallback = cb;
}

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
      trackServerTimeFromResponse(res);
      if (!res.ok) {
        // 500系はサーバー一時障害 → リトライに任せる
        // それ以外(400/401/403等)はセッション回復不能 → 強制ログアウト
        if (res.status < 500) {
          await clearRefreshToken();
          authExpiredCallback?.();
        }
        return null;
      }
      const data = await res.json();
      accessToken = data.token;
      if (data.refreshToken) await setRefreshToken(data.refreshToken);
      return data.token;
    } catch {
      // ネットワークエラー/タイムアウト → リトライに任せる
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
  trackServerTimeFromResponse(res);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetchWithTimeout(input, { ...init, headers });
      trackServerTimeFromResponse(res);
    }
  }
  return res;
};

// Hono RPC client — type-safe API access
export const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch,
});

export async function apiRefreshToken() {
  const token = await refreshAccessToken();
  if (!token) throw new Error("Token refresh failed");
  return { token };
}
