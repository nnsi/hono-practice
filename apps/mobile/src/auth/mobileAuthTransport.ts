import type {
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import { i18next } from "@packages/i18n";
import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

import { fetchWithTimeout } from "./fetchWithTimeout";
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

type TransportOptions = {
  apiUrl: string;
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

  const refreshSession = async (): Promise<RefreshResult> => {
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
  };

  // /auth/logout を access + refresh token 付きで送る。retry でも token を
  // 再取得するため引数化 (refresh token は rotation で更新されるため
  // SecureStore から再度読み直す必要がある)
  const postLogout = async (): Promise<Response> => {
    const accessToken = tokenHolder.getToken();
    const refreshToken = await getStoredRefreshToken();
    return fetchWithTimeout(`${apiUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {}),
      },
    });
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
    refreshSession,
    async logout() {
      // /auth/logout は authMiddleware が Bearer 必須なため、現在の access token を
      // 付与する。401 retry は自前実装: refreshSession が refresh token を rotate
      // するので SecureStore を読み直して新 X-Refresh-Token を送る (createAuthenticatedFetch
      // 経由だと Authorization のみ更新されて X-Refresh-Token は古い値で再送される)
      let serverOk = false;
      try {
        let res = await postLogout();
        if (res.status === 401) {
          const refreshResult = await refreshSession();
          if (refreshResult.kind === "ok") {
            tokenHolder.setToken(refreshResult.session.token);
            res = await postLogout();
          }
        }
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
