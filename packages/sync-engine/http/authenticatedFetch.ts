import type { TokenStorage } from "@packages/platform";

import { trackServerTimeFromResponse } from "../core/serverTime";

type AuthenticatedFetchOptions = {
  tokenStorage: TokenStorage;
  apiUrl: string;
};

type AuthenticatedFetchResult = {
  fetch: typeof fetch;
  setOnAuthExpired: (cb: (() => void) | null) => void;
};

export function createAuthenticatedFetch(
  options: AuthenticatedFetchOptions,
): AuthenticatedFetchResult {
  const { tokenStorage } = options;
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  let refreshPromise: Promise<string | null> | null = null;
  const authExpiredRef: { current: (() => void) | null } = { current: null };

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const res = await fetch(`${apiUrl}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        trackServerTimeFromResponse(res);
        if (!res.ok) {
          // 500系はサーバー一時障害 → リトライに任せる
          // それ以外(400/401/403等)はセッション回復不能 → 強制ログアウト
          if (res.status < 500) {
            authExpiredRef.current?.();
          }
          return null;
        }
        const data = await res.json();
        tokenStorage.setToken(data.token);
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

  const authenticatedFetch: typeof fetch = async (input, init) => {
    const token = tokenStorage.getToken();
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);
    const credentials: RequestCredentials = url.includes("/auth/")
      ? "include"
      : "omit";

    let res = await fetch(input, {
      ...init,
      headers,
      credentials,
    });
    trackServerTimeFromResponse(res);

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await fetch(input, {
          ...init,
          headers,
          credentials,
        });
        trackServerTimeFromResponse(res);
      }
    }

    return res;
  };

  return {
    fetch: authenticatedFetch,
    setOnAuthExpired: (cb: (() => void) | null) => {
      authExpiredRef.current = cb;
    },
  };
}
