import type {
  AuthDiagnosticObserver,
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
import { REFRESH_OPERATION_HEADER } from "@packages/types/authRefresh";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

import {
  WebRefreshOperationStoreError,
  newWebRefreshOperationStore,
} from "./webRefreshOperationStore";

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
  const operationStore = newWebRefreshOperationStore(apiUrl);
  const reportStorageFailure = (operation: "read" | "write" | "clear") => {
    emitAuthDiagnostic(options.onDiagnostic, {
      event: `storage_${operation}`,
      reason: `storage_${operation}_failed`,
      source: "storage",
      tokenSource: "local_storage",
    });
  };
  const withRefreshLock = <T>(operation: () => Promise<T>): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(`actiko:refresh:${apiUrl}`, operation);
    }
    return operation();
  };
  const readPending = () => {
    try {
      return operationStore.read();
    } catch {
      reportStorageFailure("read");
      return null;
    }
  };
  const clearPending = (expected: string | null) => {
    try {
      operationStore.clearIfEquals(expected);
    } catch {
      reportStorageFailure("clear");
      // A delivered session remains usable. Retaining its operation permits
      // recovery with the child cookie after storage becomes available again.
    }
  };
  const coordinator = newAuthOperationCoordinator<RefreshResult>(() =>
    runRefreshSession(),
  );

  const parseSession = async (res: Response): Promise<AuthSession> => {
    return authResponseSchema.parse(await res.json());
  };

  const postAuth = async (
    path: string,
    body: Record<string, unknown> | undefined,
  ): Promise<Response> => {
    const pending = readPending();
    const response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    // Successful auth headers replace the cookie even if its JSON body is lost.
    if (response.ok) clearPending(pending);
    return response;
  };

  const refreshWithPendingOperation = async (): Promise<RefreshResult> => {
    let operationId: string;
    try {
      operationId = operationStore.getOrCreate();
    } catch (error) {
      reportStorageFailure(
        error instanceof WebRefreshOperationStoreError
          ? error.operation
          : "write",
      );
      return { kind: "transient", reason: "network" };
    }
    for (let operationAttempt = 0; operationAttempt < 2; operationAttempt++) {
      let lastStatus: number | undefined;
      const result = await requestRefreshSession(async (signal) => {
        lastStatus = undefined;
        const response = await fetch(`${apiUrl}/auth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...options.diagnosticHeaders,
            [REFRESH_OPERATION_HEADER]: operationId,
          },
          credentials: "include",
          signal,
        });
        lastStatus = response.status;
        return response;
      }, options.onDiagnostic);
      // Parsing the complete response is the acknowledgement. Network errors,
      // partial bodies, and page termination must leave the proof recoverable.
      if (result.kind === "ok") clearPending(operationId);
      if (lastStatus !== 409 || operationAttempt !== 0) return result;
      // Only /auth/token's 409 proves the current cookie is valid and unconsumed
      // but belongs to another session. A rejected consumed parent stays 401.
      try {
        const replacement = operationStore.replaceIfEquals(operationId);
        if (replacement === null) {
          emitAuthDiagnostic(options.onDiagnostic, {
            event: "refresh_callback",
            reason: "stale_result",
            source: "refresh",
          });
          return { kind: "transient", reason: "storage" };
        }
        operationId = replacement;
      } catch (error) {
        reportStorageFailure(
          error instanceof WebRefreshOperationStoreError
            ? error.operation
            : "write",
        );
        return { kind: "transient", reason: "storage" };
      }
    }
    return { kind: "transient", reason: "network" };
  };
  const runRefreshSession = (): Promise<RefreshResult> =>
    withRefreshLock(refreshWithPendingOperation);
  const runNewSession = <T>(operation: () => Promise<T>) =>
    coordinator.runSessionOperation(() => withRefreshLock(operation));

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
      return runNewSession(async () => {
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
      return runNewSession(async () => {
        const res = await postAuth("/user", { loginId, password, consents });
        if (!res.ok) throw new Error("Registration failed");
        return parseSession(res);
      });
    },
    async googleLogin(credential, consents?: Consents) {
      return runNewSession(async () => {
        const res = await postAuth("/auth/google", { credential, consents });
        if (!res.ok) throw new Error("Google login failed");
        return parseSession(res);
      });
    },
    async appleLogin(credential, consents?: Consents) {
      return runNewSession(async () => {
        const res = await postAuth("/auth/apple", { credential, consents });
        if (!res.ok) throw new Error("Apple login failed");
        return parseSession(res);
      });
    },
    refreshSession: coordinator.refreshSession,
    logout: () =>
      coordinator.runSessionOperation(() =>
        withRefreshLock(async () => {
          const result = await performLogout(refreshWithPendingOperation);
          // The lock also covers a fallback refresh that may create a proof.
          if (result.ok) clearPending(readPending());
          return result;
        }),
      ),
    setAccessToken(token) {
      tokenHolder.setToken(token);
    },
    async persistSession() {
      const pending = readPending();
      await runNewSession(async () => clearPending(pending));
    },
    async clearPersistedSession() {
      // Snapshot before waiting: an old forceLogout/account deletion must not
      // clear a different operation created by a newer session in another tab.
      const pending = readPending();
      await runNewSession(async () => clearPending(pending));
    },
  };
}
