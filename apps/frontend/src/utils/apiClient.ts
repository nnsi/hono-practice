import { hc } from "hono/client";

import { i18next } from "@packages/i18n";
import type { TokenStorage } from "@packages/platform";
import {
  createAuthenticatedFetch,
  trackServerTimeFromResponse,
} from "@packages/sync-engine";
import type { AppType } from "@packages/types/api";

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

const authenticatedFetchResult = createAuthenticatedFetch({
  tokenStorage,
  apiUrl: API_URL,
});

export const customFetch = authenticatedFetchResult.fetch;
export const setOnAuthExpired = authenticatedFetchResult.setOnAuthExpired;

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
    trackServerTimeFromResponse(res);
  } catch {
    throw new Error(i18next.t("common:api.networkError"));
  }
  if (!res.ok) {
    if (res.status === 401)
      throw new Error(i18next.t("common:api.invalidCredentials"));
    if (res.status >= 500) throw new Error(i18next.t("common:api.serverError"));
    throw new Error(i18next.t("common:api.loginError"));
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}
