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
  } = options;

  let state: AuthControllerState = initialState;
  const listeners = new Set<() => void>();
  let generation = 0;
  const retryScheduler = newAuthRetryScheduler(online);

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
    try {
      await performInitialSync(session.user.id);
    } catch {
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

  const resetAuthState = async (gen: number): Promise<boolean> => {
    transport.setAccessToken(null);
    await authStateRepo.clearLastLoginAt();
    if (gen !== generation) return false;
    await onAuthStateReset?.();
    if (gen !== generation) return false;
    setState({ isLoggedIn: false, syncReady: false, userId: null });
    return true;
  };

  const beginSessionChange = () => {
    const gen = ++generation;
    retryScheduler.reset();
    return gen;
  };

  const hydrate = async () => {
    const [userId, lastLoginAt] = await Promise.all([
      authStateRepo.getCurrentUserId(),
      authStateRepo.getLastLoginAt(),
    ]);
    if (userId && lastLoginAt) {
      setState({ userId, isLoggedIn: true, isLoading: false });
    } else {
      setState({ isLoading: false });
    }
  };

  const reconcile = async (): Promise<boolean> => {
    const gen = ++generation;
    retryScheduler.clear();
    let result: Awaited<ReturnType<typeof transport.refreshSession>>;
    try {
      result = await transport.refreshSession();
    } catch {
      // 例外もネットワーク等の一時障害扱い → online 復帰で retry
      registerOnlineRetry(gen);
      return false;
    }
    if (gen !== generation) return false;

    if (result.kind === "expired") {
      retryScheduler.reset();
      await resetAuthState(gen);
      return false;
    }
    if (result.kind === "transient") {
      registerOnlineRetry(gen);
      return false;
    }
    return applySession(result.session, gen);
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
      const gen = ++generation;
      retryScheduler.reset();
      // backend logout は Bearer 必須なので、local reset より先に呼ぶ。
      const result = await transport.logout().catch(() => ({ ok: false }));
      if (result.ok && gen === generation) {
        await resetAuthState(gen);
      }
      return result;
    },
    forceLogout: async () => {
      const gen = ++generation;
      retryScheduler.reset();
      // server cleanup を介さない経路でも永続 credential を削除する。
      await transport.clearPersistedSession().catch(() => {});
      if (gen === generation) await resetAuthState(gen);
    },
  };
}
