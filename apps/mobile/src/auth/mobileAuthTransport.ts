import type {
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import {
  classifyRefreshFailure,
  newAuthOperationCoordinator,
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
  invalidCredentials?: string;
  generic: string;
};

export function createMobileAuthTransport(
  options: TransportOptions,
  tokenHolder: TokenHolder,
): AuthTransport {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  const coordinator = newAuthOperationCoordinator<RefreshResult>(() =>
    runRefreshSession(),
  );

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

  const runRefreshSession = async (): Promise<RefreshResult> => {
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
    const failure = classifyRefreshFailure(res.status);
    if (failure.kind === "expired") {
      await clearStoredRefreshToken();
    }
    return failure;
  };

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

  const performLogout = async (
    refreshDuringLogout: () => Promise<RefreshResult>,
  ): Promise<{ ok: boolean }> => {
    let serverOk = false;
    try {
      let res = await postLogout();
      if (res.status === 401) {
        const refreshResult = await refreshDuringLogout();
        if (refreshResult.kind === "ok") {
          tokenHolder.setToken(refreshResult.session.token);
          res = await postLogout();
          serverOk = res.ok;
        } else if (refreshResult.kind === "expired") {
          serverOk = true;
        }
      } else {
        serverOk = res.ok;
      }
    } catch {
      // credential を保持し、logout を再試行可能にする。
    }
    if (serverOk) {
      await clearStoredRefreshToken();
    }
    return { ok: serverOk };
  };

  return {
    login: (loginId, password) =>
      coordinator.runSessionOperation(() =>
        postAuthAndParse(
          "/auth/login",
          { login_id: loginId, password },
          {
            invalidCredentials: i18next.t("common:api.invalidCredentials"),
            generic: i18next.t("common:auth.loginError"),
          },
        ),
      ),
    register: (loginId, password, consents) =>
      coordinator.runSessionOperation(() =>
        postAuthAndParse(
          "/user",
          { loginId, password, consents },
          { generic: i18next.t("common:auth.registerError") },
        ),
      ),
    googleLogin: (credential, consents?: Consents) =>
      coordinator.runSessionOperation(() =>
        postAuthAndParse(
          "/auth/google",
          { credential, consents },
          { generic: i18next.t("common:auth.googleLoginError") },
        ),
      ),
    appleLogin: (credential, consents?: Consents) =>
      coordinator.runSessionOperation(() =>
        postAuthAndParse(
          "/auth/apple",
          { credential, consents },
          { generic: i18next.t("common:auth.appleLoginError") },
        ),
      ),
    refreshSession: coordinator.refreshSession,
    logout: () => coordinator.runSessionOperation(performLogout),
    setAccessToken(token) {
      tokenHolder.setToken(token);
    },
    async persistSession(session) {
      await coordinator.runSessionOperation(async () => {
        if (session.refreshToken)
          await setStoredRefreshToken(session.refreshToken);
      });
    },
    async clearPersistedSession() {
      await coordinator.runSessionOperation(async () => {
        await clearStoredRefreshToken();
      });
    },
  };
}
