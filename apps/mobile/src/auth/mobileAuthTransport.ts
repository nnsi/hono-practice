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
import {
  REFRESH_OPERATION_HEADER,
  refreshOperationIdSchema,
} from "@packages/types/authRefresh";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";

import { fetchWithTimeout } from "./fetchWithTimeout";
import {
  type StoredRefreshSession,
  clearStoredRefreshToken,
  getStoredRefreshSession,
  setStoredRefreshSession,
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
  // The coordinator serializes auth operations. Memory only supplements the
  // durable operation record; a received session is saved again before rotating.
  let pendingCredential: StoredRefreshSession | undefined;
  let pendingRefreshSession: AuthSession | null = null;

  const readRefreshCredential = async (): Promise<StoredRefreshSession> => {
    if (pendingCredential !== undefined) {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_read",
        reason: pendingCredential.refreshToken ? "ok" : "missing_refresh_token",
        source: "storage",
        tokenSource: "memory",
      });
      return pendingCredential;
    }
    try {
      const credential = await getStoredRefreshSession();
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_read",
        reason: credential.refreshToken ? "ok" : "missing_refresh_token",
        source: "storage",
        tokenSource: storageSource,
      });
      return credential;
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

  const persistCredential = async (
    credential: StoredRefreshSession,
  ): Promise<void> => {
    pendingCredential = credential;
    let attempt: 1 | 2 = 1;
    try {
      await setStoredRefreshSession(credential);
    } catch {
      emitAuthDiagnostic(onDiagnostic, {
        event: "storage_write",
        reason: "storage_write_retry",
        source: "storage",
        tokenSource: storageSource,
        attempt,
      });
      // Retry this exact credential without initiating another rotation.
      attempt = 2;
      try {
        await setStoredRefreshSession(credential);
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
    pendingCredential = undefined;
    emitAuthDiagnostic(onDiagnostic, {
      event: "storage_write",
      reason: "ok",
      source: "storage",
      tokenSource: storageSource,
      attempt,
    });
  };

  const persistRefreshToken = (token: string): Promise<void> =>
    persistCredential({
      version: 2,
      refreshToken: token,
      pendingOperationId: null,
    });

  const clearRefreshToken = async (): Promise<void> => {
    pendingRefreshSession = null;
    pendingCredential = {
      version: 2,
      refreshToken: null,
      pendingOperationId: null,
    };
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
    pendingCredential = undefined;
    emitAuthDiagnostic(onDiagnostic, {
      event: "storage_clear",
      reason: "ok",
      source: "storage",
      tokenSource: storageSource,
    });
  };

  const persistSession = async (res: Response): Promise<AuthSession> => {
    const session = authResponseSchema.parse(await res.json());
    if (session.refreshToken) {
      pendingRefreshSession = null;
      await persistRefreshToken(session.refreshToken);
    }
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
      const credential = await readRefreshCredential();
      if (pendingRefreshSession) {
        const session = pendingRefreshSession;
        await persistRefreshToken(session.refreshToken!);
        pendingRefreshSession = null;
        return { kind: "ok", session };
      }
      const rt = credential.refreshToken;
      if (!rt) {
        emitAuthDiagnostic(onDiagnostic, {
          event: "refresh_result",
          reason: "missing_refresh_token",
          source: "refresh",
          tokenSource: "none",
        });
        return { kind: "expired" };
      }
      const operationId =
        credential.pendingOperationId ??
        refreshOperationIdSchema.parse(randomUUID());
      // Persist the secret proof before HTTP. The same pair survives retries,
      // suspended JS timers, and process recreation after a committed rotation.
      await persistCredential({
        version: 2,
        refreshToken: rt,
        pendingOperationId: operationId,
      });
      const result = await requestRefreshSession(
        (signal) =>
          fetch(`${apiUrl}/auth/token`, {
            method: "POST",
            headers: {
              ...options.diagnosticHeaders,
              "Content-Type": "application/json",
              Authorization: `Bearer ${rt}`,
              [REFRESH_OPERATION_HEADER]: operationId,
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
        pendingRefreshSession = result.session;
        await persistRefreshToken(result.session.refreshToken);
        pendingRefreshSession = null;
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
    const refreshToken = (await readRefreshCredential()).refreshToken;
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
        if (session.refreshToken) {
          pendingRefreshSession = null;
          await persistRefreshToken(session.refreshToken);
        }
      });
    },
    async clearPersistedSession() {
      await coordinator.runSessionOperation(async () => {
        await clearRefreshToken();
      });
    },
  };
}
