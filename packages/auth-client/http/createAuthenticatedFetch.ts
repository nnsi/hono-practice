import { trackServerTimeFromResponse } from "@packages/sync-engine";

export type AccessTokenSource = {
  getToken(): string | null;
};

export type AuthenticatedFetchOptions = {
  tokenSource: AccessTokenSource;
  // /auth/token を叩いて新しい access token を取得する。
  // - 成功: 新 access token を返す。呼び出し側 (Web/Mobile の authController で
  //   setRefreshAccessToken に渡している実装) は内部で transport.setAccessToken
  //   も呼んで tokenSource を更新する。これにより 401 retry 直後の本リクエストだけ
  //   でなく、後続リクエストも新 token で送られる
  // - セッション復元不能 / ネットワーク等の一時障害: null を返す
  //   (RefreshResult kind の解釈は controller 側、ここでは success/failure の二値のみ)
  refreshAccessToken(): Promise<string | null>;
  // /auth/* リクエスト時にデフォルトで credentials: include を付けるか (Web のみ true)
  includeCredentialsForAuthEndpoints?: boolean;
  // request 単位の timeout (Mobile 用)
  requestTimeoutMs?: number;
};

export type AuthenticatedFetchResult = {
  fetch: typeof fetch;
};

export function createAuthenticatedFetch(
  options: AuthenticatedFetchOptions,
): AuthenticatedFetchResult {
  const {
    tokenSource,
    refreshAccessToken,
    includeCredentialsForAuthEndpoints = false,
    requestTimeoutMs,
  } = options;

  let refreshPromise: Promise<string | null> | null = null;

  const sharedRefresh = (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        return await refreshAccessToken();
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  };

  const baseFetch: typeof fetch = (input, init) => {
    if (requestTimeoutMs === undefined) {
      return fetch(input, init);
    }
    const controller = new AbortController();
    const existingSignal = init?.signal;
    if (existingSignal) {
      existingSignal.addEventListener("abort", () => controller.abort());
    }
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timeoutId),
    );
  };

  const authenticatedFetch: typeof fetch = async (input, init) => {
    const token = tokenSource.getToken();
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

    // pathname を抽出して完全一致で判定する (`/auth/token-debug` 等の誤検知を防ぐ)
    let pathname = url;
    try {
      pathname = new URL(url, "http://localhost").pathname;
    } catch {
      // 入力が URL として解釈できない場合は素の文字列として扱う
    }
    const isAuthEndpoint = pathname.startsWith("/auth/");
    const isAuthRefreshEndpoint = pathname === "/auth/token";
    const credentials: RequestCredentials | undefined =
      includeCredentialsForAuthEndpoints
        ? isAuthEndpoint
          ? "include"
          : "omit"
        : undefined;

    const finalInit: RequestInit = {
      ...init,
      headers,
      ...(credentials ? { credentials } : {}),
    };

    let res = await baseFetch(input, finalInit);
    trackServerTimeFromResponse(res);

    if (res.status === 401 && !isAuthRefreshEndpoint) {
      const newToken = await sharedRefresh();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await baseFetch(input, {
          ...finalInit,
          headers,
        });
        trackServerTimeFromResponse(res);
      }
    }

    return res;
  };

  return { fetch: authenticatedFetch };
}
