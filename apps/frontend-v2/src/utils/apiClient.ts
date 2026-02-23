import { hc } from "hono/client";
import type { AppType } from "@backend/app";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3456";

let accessToken: string | null = null;

function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

// トークンリフレッシュの排他制御
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      setToken(data.token);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// hcに渡すcustom fetch（トークン付与、credentials制御、401リトライ）
export const customFetch: typeof fetch = async (input, init) => {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const credentials: RequestCredentials = url.includes("/auth/")
    ? "include"
    : "omit";

  let res = await fetch(input, {
    ...init,
    headers,
    credentials,
  });

  // 401 → トークンリフレッシュ（排他制御付き） → 1回リトライ
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input, {
        ...init,
        headers,
        credentials,
      });
    }
  }

  return res;
};

// Hono RPC クライアント
export const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch,
});

export async function apiLogin(loginId: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  if (!res.ok) {
    throw new Error("Login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}
