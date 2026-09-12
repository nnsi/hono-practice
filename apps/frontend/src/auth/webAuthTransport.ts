import type {
  AuthDiagnosticObserver,
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import {
  newAuthOperationCoordinator,
  requestRefreshSession,
} from "@packages/auth-client";
import { i18next } from "@packages/i18n";
import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

type TransportOptions = {
  apiUrl: string;
  onDiagnostic?: AuthDiagnosticObserver;
  diagnosticHeaders?: Record<string, string>;
};

type TokenHolder = {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
};

export function createWebAuthTransport(
  options: TransportOptions,
  tokenHolder: TokenHolder,
): AuthTransport {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  const coordinator = newAuthOperationCoordinator<RefreshResult>(() =>
    runRefreshSession(),
  );

  const parseSession = async (res: Response): Promise<AuthSession> => {
    return authResponseSchema.parse(await res.json());
  };

  const postAuth = (
    path: string,
    body: Record<string, unknown> | undefined,
  ): Promise<Response> => {
    return fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const runRefreshSession = async (): Promise<RefreshResult> => {
    const refresh = () =>
      requestRefreshSession(
        (signal) =>
          fetch(`${apiUrl}/auth/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...options.diagnosticHeaders,
            },
            credentials: "include",
            signal,
          }),
        options.onDiagnostic,
      );
    // タブごとに異なる coordinator を補完し、更新後の Cookie で次を送る。
    // ロックは body の受信と直後の再試行が完了するまで保持する。
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(`actiko:refresh:${apiUrl}`, refresh);
    }
    return refresh();
  };

  const postLogout = (): Promise<Response> => {
    const accessToken = tokenHolder.getToken();
    return fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
    });
  };

  const performLogout = async (
    refreshDuringLogout: () => Promise<RefreshResult>,
  ): Promise<{ ok: boolean }> => {
    try {
      let res = await postLogout();
      if (res.status !== 401) return { ok: res.ok };
      const refreshResult = await refreshDuringLogout();
      if (refreshResult.kind === "expired") return { ok: true };
      if (refreshResult.kind === "transient") return { ok: false };
      tokenHolder.setToken(refreshResult.session.token);
      res = await postLogout();
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  };

  return {
    async login(loginId, password) {
      return coordinator.runSessionOperation(async () => {
        let res: Response;
        try {
          res = await postAuth("/auth/login", { login_id: loginId, password });
          trackServerTimeFromResponse(res);
        } catch {
          throw new Error(i18next.t("common:api.networkError"));
        }
        if (!res.ok) {
          if (res.status === 401)
            throw new Error(i18next.t("common:api.invalidCredentials"));
          if (res.status >= 500)
            throw new Error(i18next.t("common:api.serverError"));
          throw new Error(i18next.t("common:api.loginError"));
        }
        return parseSession(res);
      });
    },
    async register(loginId, password, consents) {
      return coordinator.runSessionOperation(async () => {
        const res = await postAuth("/user", { loginId, password, consents });
        if (!res.ok) throw new Error("Registration failed");
        return parseSession(res);
      });
    },
    async googleLogin(credential, consents?: Consents) {
      return coordinator.runSessionOperation(async () => {
        const res = await postAuth("/auth/google", { credential, consents });
        if (!res.ok) throw new Error("Google login failed");
        return parseSession(res);
      });
    },
    async appleLogin(credential, consents?: Consents) {
      return coordinator.runSessionOperation(async () => {
        const res = await postAuth("/auth/apple", { credential, consents });
        if (!res.ok) throw new Error("Apple login failed");
        return parseSession(res);
      });
    },
    refreshSession: coordinator.refreshSession,
    logout: () => coordinator.runSessionOperation(performLogout),
    setAccessToken(token) {
      tokenHolder.setToken(token);
    },
    async persistSession() {
      await coordinator.runSessionOperation(async () => {});
    },
    async clearPersistedSession() {
      await coordinator.runSessionOperation(async () => {});
    },
  };
}
