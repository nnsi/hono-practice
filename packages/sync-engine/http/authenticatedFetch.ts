import type { TokenStorage } from "@packages/platform";

type AuthenticatedFetchOptions = {
  tokenStorage: TokenStorage;
  apiUrl: string;
};

export function createAuthenticatedFetch(
  options: AuthenticatedFetchOptions,
): typeof fetch {
  const { tokenStorage } = options;
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  let refreshPromise: Promise<string | null> | null = null;

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const res = await fetch(`${apiUrl}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) return null;
        const data = await res.json();
        tokenStorage.setToken(data.token);
        return data.token;
      } catch {
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

  return authenticatedFetch;
}
