import type {
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import {
  emitAuthDiagnostic,
  newAuthOperationCoordinator,
  requestRefreshSession,
} from "@packages/auth-client";
import { i18next } from "@packages/i18n";
import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { AuthDiagnosticObserver } from "@packages/types/authDiagnostics";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";
import { Platform } from "react-native";

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
  onDiagnostic?: AuthDiagnosticObserver;
  diagnosticHeaders?: Record<string, string>;
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
  const onDiagnostic = options.onDiagnostic;
  const storageSource =
    Platform.OS === "web" ? "local_storage" : "secure_store";
  const coordinator = newAuthOperationCoordinator<RefreshResult>(() =>
    runRefreshSession(),
  );
  // 認証操作の直列化は coordinator に任せ、保存できなかった最新 token だけ保持する。
  let pendingRefreshToken: string | null | undefined;

  const readRefreshToken = async (): Promise<string | null> => {
    if (pendingRefreshToken !== undefined) {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_read",
        reason: pendingRefreshToken ? "ok" : "missing_refresh_token",
        source: "storage",
        tokenSource: "memory",
      });
      return pendingRefreshToken;
    }
    try {
      const token = await getStoredRefreshToken();
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_read",
        reason: token ? "ok" : "missing_refresh_token",
        source: "storage",
        tokenSource: storageSource,
      });
      return token;
    } catch (error) {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_read",
        reason: "storage_read_failed",
        source: "storage",
        tokenSource: storageSource,
      });
      throw error;
    }
  };

  const persistRefreshToken = async (token: string): Promise<void> => {
    pendingRefreshToken = token;
    let attempt: 1 | 2 = 1;
    try {
      await setStoredRefreshToken(token);
    } catch {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_write",
        reason: "storage_write_retry",
        source: "storage",
        tokenSource: storageSource,
        attempt,
      });
      // サーバーで再 rotation せず、受信済みの同じ token の保存だけを再試行する。
      attempt = 2;
      try {
        await setStoredRefreshToken(token);
      } catch (error) {
        emitAuthDiagnostic(onDiagnostic, {
          event: "storage_write",
          reason: "storage_write_failed",
          source: "storage",
          tokenSource: storageSource,
          attempt,
        });
        throw error;
      }
    }
    pendingRefreshToken = undefined;
    emitAuthDiagnostic(onDiagnostic, {
      event: "storage_write",
      reason: "ok",
      source: "storage",
      tokenSource: storageSource,
      attempt,
    });
  };

  const clearRefreshToken = async (): Promise<void> => {
    pendingRefreshToken = null;
    try {
      await clearStoredRefreshToken();
    } catch (error) {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_clear",
        reason: "storage_clear_failed",
        source: "storage",
        tokenSource: storageSource,
      });
      throw error;
    }
    pendingRefreshToken = undefined;
    emitAuthDiagnostic(onDiagnostic, {
      event: "storage_clear",
      reason: "ok",
      source: "storage",
      tokenSource: storageSource,
    });
  };

  const persistSession = async (res: Response): Promise<AuthSession> => {
    const session = authResponseSchema.parse(await res.json());
    if (session.refreshToken) await persistRefreshToken(session.refreshToken);
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
    try {
      const rt = await readRefreshToken();
      if (!rt) {
        emitAuthDiagnostic(onDiagnostic, {
          event: "refresh_result",
          reason: "missing_refresh_token",
          source: "refresh",
          tokenSource: "none",
        });
        return { kind: "expired" };
      }
      const result = await requestRefreshSession(
        (signal) =>
          fetch(`${apiUrl}/auth/token`, {
            method: "POST",
            headers: {
              ...options.diagnosticHeaders,
              "Content-Type": "application/json",
              Authorization: `Bearer ${rt}`,
            },
            signal,
          }),
        onDiagnostic,
      );
      if (result.kind === "ok") {
        if (!result.session.refreshToken) {
          emitAuthDiagnostic(onDiagnostic, {
            event: "refresh_result",
            reason: "missing_rotated_token",
            source: "refresh",
          });
          return { kind: "transient", reason: "missing refresh token" };
        }
        await persistRefreshToken(result.session.refreshToken);
      } else if (result.kind === "expired") {
        await clearRefreshToken();
      }
      return result;
    } catch {
      return { kind: "transient", reason: "storage" };
    }
  };

  const postLogout = async (): Promise<Response> => {
    const accessToken = tokenHolder.getToken();
    const refreshToken = await readRefreshToken();
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
      await clearRefreshToken();
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
          await persistRefreshToken(session.refreshToken);
      });
    },
    async clearPersistedSession() {
      await coordinator.runSessionOperation(async () => {
        await clearRefreshToken();
      });
    },
  };
}
