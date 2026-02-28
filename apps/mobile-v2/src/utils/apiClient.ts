import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { hc } from "hono/client";
import type { AppType } from "@packages/api-contract";

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // Expo Go: use the same host IP that Metro bundler uses
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:3456`;
  }
  return "http://localhost:3456";
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
      const res = await fetch(`${API_URL}/auth/token`, {
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

export const customFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers });
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
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_id: loginId, password }),
  });
  if (!res.ok) throw new Error("Login failed");
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
  const res = await fetch(`${API_URL}/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name || undefined, loginId, password }),
  });
  if (!res.ok) throw new Error("Registration failed");
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
  const res = await fetch(`${API_URL}/auth/token`, {
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
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) throw new Error("Google login failed");
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}
