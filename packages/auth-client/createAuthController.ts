import type { AuthDiagnosticEntry } from "@packages/types/authDiagnostics";

import { emitAuthDiagnostic } from "./authDiagnosticObserver";
import { newAuthRetryScheduler } from "./authRetryScheduler";
import type {
  AuthController,
  AuthControllerOptions,
  AuthControllerState,
  AuthSession,
} from "./types";

const initialState: AuthControllerState = {
  isLoggedIn: false,
  isLoading: true,
  syncReady: false,
  userId: null,
};

export function createAuthController(
  options: AuthControllerOptions,
): AuthController {
  const {
    transport,
    authStateRepo,
    online,
    onUserSwitch,
    performInitialSync,
    onUserSynced,
    onAuthStateReset,
    onDiagnostic,
  } = options;

  let state: AuthControllerState = initialState;
  const listeners = new Set<() => void>();
  let generation = 0;
  // 作業の generation と分け、同じユーザーの reconcile では変えない。
  let sessionIdentityVersion = 0;
  const retryScheduler = newAuthRetryScheduler(online);
  const report = (entry: AuthDiagnosticEntry) =>
    emitAuthDiagnostic(onDiagnostic, entry);

  const emit = () => {
    for (const l of listeners) l();
  };
  const setState = (patch: Partial<AuthControllerState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const applySession = async (
    session: AuthSession,
    gen: number,
  ): Promise<boolean> => {
    const previousUserId = await authStateRepo.getCurrentUserId();
    if (gen !== generation) return false;
    if (previousUserId && previousUserId !== session.user.id) {
      sessionIdentityVersion++;
    }
    transport.setAccessToken(session.token);
    if (previousUserId && previousUserId !== session.user.id) {
      await onUserSwitch?.();
      if (gen !== generation) return false;
    }
    await authStateRepo.setUserId(session.user.id);
    if (gen !== generation) return false;
    await authStateRepo.setLastLoginAt(new Date().toISOString());
    if (gen !== generation) return false;
    await authStateRepo.setPlan(session.user.plan);
    if (gen !== generation) return false;
    await onUserSynced?.(session.user);
    if (gen !== generation) return false;
    setState({ userId: session.user.id, isLoggedIn: true });
    report({ event: "session_established", reason: "ok" });
    try {
      await performInitialSync(session.user.id);
    } catch {
      report({
        event: "reconcile_failed",
        reason: "sync_failed",
        wasLoggedIn: state.isLoggedIn,
      });
      // 認証自体は成立しているため logged-in state は保持する。ただし保護用の
      // initial pull が成功するまでは syncReady を上げず、一時障害として再試行する。
      registerOnlineRetry(gen);
      return false;
    }
    if (gen !== generation) return false;
    retryScheduler.reset();
    setState({ syncReady: true });
    return true;
  };

  const resetAuthState = async (
    gen: number,
    reason: AuthDiagnosticEntry["reason"],
    source: AuthDiagnosticEntry["source"],
  ): Promise<boolean> => {
    const wasLoggedIn = state.isLoggedIn;
    sessionIdentityVersion++;
    transport.setAccessToken(null);
    await authStateRepo.clearLastLoginAt();
    if (gen !== generation) return false;
    await onAuthStateReset?.();
    if (gen !== generation) return false;
    setState({ isLoggedIn: false, syncReady: false, userId: null });
    report({ event: "session_cleared", reason, source, wasLoggedIn });
    return true;
  };

  const beginSessionChange = () => {
    sessionIdentityVersion++;
    const gen = ++generation;
    retryScheduler.reset();
    return gen;
  };

  const hydrate = async () => {
    let userId: string | null;
    let lastLoginAt: string | null;
    try {
      [userId, lastLoginAt] = await Promise.all([
        authStateRepo.getCurrentUserId(),
        authStateRepo.getLastLoginAt(),
      ]);
    } catch (error) {
      report({
        event: "reconcile_failed",
        source: "bootstrap",
        reason: "local_state_read_failed",
      });
      throw error;
    }
    const age = lastLoginAt ? Date.now() - Date.parse(lastLoginAt) : undefined;
    report({
      event: "hydrate",
      source: "bootstrap",
      reason:
        userId && lastLoginAt
          ? "local_session_present"
          : "local_session_missing",
      hasLocalUser: !!userId,
      hasLastLogin: !!lastLoginAt,
      lastLoginAgeMs:
        age !== undefined && Number.isFinite(age)
          ? Math.min(31_536_000_000, Math.max(0, age))
          : undefined,
    });
    if (userId && lastLoginAt) {
      setState({ userId, isLoggedIn: true, isLoading: false });
    } else {
      setState({ isLoading: false });
    }
  };

  const reconcile = async (
    source: "bootstrap" | "reconcile" = "reconcile",
  ): Promise<boolean> => {
    const gen = ++generation;
    retryScheduler.clear();
    let result: Awaited<ReturnType<typeof transport.refreshSession>>;
    try {
      result = await transport.refreshSession();
    } catch {
      report({
        event: "reconcile_failed",
        source,
        reason: "network",
        wasLoggedIn: state.isLoggedIn,
      });
      // 例外もネットワーク等の一時障害扱い → online 復帰で retry
      registerOnlineRetry(gen);
      return false;
    }
    if (gen !== generation) {
      report({ event: "refresh_callback", source, reason: "stale_result" });
      return false;
    }

    if (result.kind === "expired") {
      retryScheduler.reset();
      await resetAuthState(gen, "refresh_expired", source);
      return false;
    }
    if (result.kind === "transient") {
      registerOnlineRetry(gen);
      return false;
    }
    try {
      return await applySession(result.session, gen);
    } catch (error) {
      report({
        event: "reconcile_failed",
        source,
        reason: "apply_failed",
        wasLoggedIn: state.isLoggedIn,
      });
      throw error;
    }
  };

  const registerOnlineRetry = (gen: number) => {
    if (gen !== generation) return;
    retryScheduler.schedule(() => {
      if (gen !== generation) return;
      void reconcile();
    });
  };

  return {
    getState: () => state,
    getSessionVersion: () => generation,
    getSessionIdentityVersion: () => sessionIdentityVersion,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    reconcile,
    login: async (loginId, password) => {
      const gen = beginSessionChange();
      const session = await transport.login(loginId, password);
      if (gen !== generation) return;
      await applySession(session, gen);
    },
    register: async (loginId, password, consents) => {
      const gen = beginSessionChange();
      const session = await transport.register(loginId, password, consents);
      if (gen !== generation) return;
      await applySession(session, gen);
      if (gen === generation) {
        await authStateRepo.setTutorialStatus("pending");
      }
    },
    googleLogin: async (credential, consents) => {
      const gen = beginSessionChange();
      const session = await transport.googleLogin(credential, consents);
      if (gen !== generation) return;
      await applySession(session, gen);
    },
    appleLogin: async (credential, consents) => {
      const gen = beginSessionChange();
      const session = await transport.appleLogin(credential, consents);
      if (gen !== generation) return;
      await applySession(session, gen);
    },
    applyExternalSession: async (session) => {
      const gen = beginSessionChange();
      await transport.persistSession(session);
      if (gen !== generation) return;
      await applySession(session, gen);
    },
    logout: async () => {
      sessionIdentityVersion++;
      const gen = ++generation;
      retryScheduler.reset();
      // backend logout は Bearer 必須なので、local reset より先に呼ぶ。
      const result = await transport.logout().catch(() => ({ ok: false }));
      if (result.ok && gen === generation) {
        await resetAuthState(gen, "user_logout", "logout");
      }
      return result;
    },
    forceLogout: async (reason = "forced_logout") => {
      sessionIdentityVersion++;
      const gen = ++generation;
      retryScheduler.reset();
      // server cleanup を介さない経路でも永続 credential を削除する。
      await transport.clearPersistedSession().catch(() => {});
      if (gen === generation)
        await resetAuthState(
          gen,
          reason,
          reason === "refresh_expired"
            ? "api_401"
            : reason === "account_deleted"
              ? "account_delete"
              : "logout",
        );
    },
  };
}
