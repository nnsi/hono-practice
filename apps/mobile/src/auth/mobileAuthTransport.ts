import type {
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import { i18next } from "@packages/i18n";
import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "./refreshTokenStorage";

export {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "./refreshTokenStorage";

const REQUEST_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = init?.signal;
  if (existingSignal) {
    existingSignal.addEventListener("abort", () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

type TransportOptions = {
  apiUrl: string;
  // 401 retry + Bearer 自動付与つき fetch (createAuthenticatedFetch 経由)。
  // logout は authMiddleware が Bearer 必須なので、access token 期限切れ時に
  // 自動 refresh + retry されないと「永久に 401 で詰む」状態になる
  authenticatedFetch: typeof fetch;
};

type TokenHolder = {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
};

type ErrorMessages = {
  // 401 受信時に特殊扱いするキー (login のみ「ID/パスワード違い」を出すため)
  invalidCredentials?: string;
  generic: string;
};

export function createMobileAuthTransport(
  options: TransportOptions,
  tokenHolder: TokenHolder,
): AuthTransport {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  const authenticatedFetch = options.authenticatedFetch;

  // login/register/oauth レスポンスから session を取り出す内部 helper。
  // access token のメモリ反映は controller.applySession 内の transport.setAccessToken
  // の専任なのでここでは呼ばない。refresh token のみ永続層に書き込む。
  const persistSession = async (res: Response): Promise<AuthSession> => {
    const session = authResponseSchema.parse(await res.json());
    if (session.refreshToken) await setStoredRefreshToken(session.refreshToken);
    return session;
  };

  const postAuthAndParse = async (
    path: string,
    body: Record<string, unknown>,
    msgs: ErrorMessages,
  ): Promise<AuthSession> => {
    let res: Response;
    try {
      res = await fetchWithTimeout(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      trackServerTimeFromResponse(res);
    } catch {
      throw new Error(i18next.t("common:api.networkError"));
    }
    if (!res.ok) {
      if (res.status === 401 && msgs.invalidCredentials)
        throw new Error(msgs.invalidCredentials);
      if (res.status >= 500)
        throw new Error(i18next.t("common:api.serverError"));
      throw new Error(msgs.generic);
    }
    return persistSession(res);
  };

  return {
    login: (loginId, password) =>
      postAuthAndParse(
        "/auth/login",
        { login_id: loginId, password },
        {
          invalidCredentials: i18next.t("common:api.invalidCredentials"),
          generic: i18next.t("common:auth.loginError"),
        },
      ),
    register: (loginId, password, consents) =>
      postAuthAndParse(
        "/user",
        { loginId, password, consents },
        { generic: i18next.t("common:auth.registerError") },
      ),
    googleLogin: (credential, consents?: Consents) =>
      postAuthAndParse(
        "/auth/google",
        { credential, consents },
        { generic: i18next.t("common:auth.googleLoginError") },
      ),
    appleLogin: (credential, consents?: Consents) =>
      postAuthAndParse(
        "/auth/apple",
        { credential, consents },
        { generic: i18next.t("common:auth.appleLoginError") },
      ),
    async refreshSession(): Promise<RefreshResult> {
      const rt = await getStoredRefreshToken();
      if (!rt) return { kind: "expired" };
      let res: Response;
      try {
        res = await fetchWithTimeout(`${apiUrl}/auth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rt}`,
          },
        });
        trackServerTimeFromResponse(res);
      } catch {
        return { kind: "transient", reason: "network" };
      }
      if (res.ok) return { kind: "ok", session: await persistSession(res) };
      if (res.status < 500) {
        await clearStoredRefreshToken();
        return { kind: "expired" };
      }
      return { kind: "transient", reason: `status ${res.status}` };
    },
    async logout() {
      // /auth/logout は authMiddleware が Bearer 必須。authenticatedFetch は
      // Bearer 自動付与 + 401 retry (refresh → 新 token で再送) を担う。
      // X-Refresh-Token は authenticatedFetch が付与しないため明示的に乗せる
      const refreshToken = await getStoredRefreshToken();
      let serverOk = false;
      try {
        const res = await authenticatedFetch(`${apiUrl}/auth/logout`, {
          method: "POST",
          headers: refreshToken ? { "X-Refresh-Token": refreshToken } : {},
        });
        serverOk = res.ok;
      } catch {
        // network error / timeout など。SecureStore を消さず再試行可能にする
      }
      // server 成功時のみ SecureStore を clear する。失敗時に消すと
      // X-Refresh-Token を再送できず logout 再試行が永久に通らなくなる
      // (controller 側も { ok: false } 時は local state を保持する)
      if (serverOk) {
        await clearStoredRefreshToken();
      }
      return { ok: serverOk };
    },
    setAccessToken(token) {
      tokenHolder.setToken(token);
    },
    async persistSession(session) {
      // 永続層 (SecureStore) への書き込みのみ。access token のメモリ反映は
      // setAccessToken の専任。
      if (session.refreshToken)
        await setStoredRefreshToken(session.refreshToken);
    },
    async clearPersistedSession() {
      await clearStoredRefreshToken();
    },
  };
}
