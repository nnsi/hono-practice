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
  // セッション世代カウンタ。login / logout / handleAuthExpired / 各 reconcile で
  // increment し、走行中の非同期処理が古い世代の結果で state を上書きしないよう守る
  let generation = 0;
  let onlineCleanup: (() => void) | null = null;

  const emit = () => {
    for (const l of listeners) l();
  };
  const setState = (patch: Partial<AuthControllerState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const clearOnlineRetry = () => {
    if (onlineCleanup) {
      onlineCleanup();
      onlineCleanup = null;
    }
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
    await performInitialSync(session.user.id);
    if (gen !== generation) return false;
    setState({ syncReady: true });
    return true;
  };

  const resetAuthState = async () => {
    transport.setAccessToken(null);
    await authStateRepo.clearLastLoginAt();
    await onAuthStateReset?.();
    setState({ isLoggedIn: false, syncReady: false, userId: null });
  };

  const finalizeLogin = async (session: AuthSession): Promise<void> => {
    const gen = ++generation;
    clearOnlineRetry();
    await applySession(session, gen);
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
      await resetAuthState();
      return false;
    }
    if (result.kind === "transient") {
      registerOnlineRetry(gen);
      return false;
    }
    return applySession(result.session, gen);
  };

  const registerOnlineRetry = (gen: number) => {
    if (!online || gen !== generation) return;
    clearOnlineRetry();
    onlineCleanup = online.registerOnlineRetry(() => {
      // adapter 側の登録解除 (NetInfo.removeEventListener / window.removeEventListener)
      // を明示的に呼ばないと、reconcile が成功してもリスナーが生き続けてしまう
      clearOnlineRetry();
      void reconcile();
    });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    reconcile,
    login: async (loginId, password) => {
      const session = await transport.login(loginId, password);
      await finalizeLogin(session);
    },
    register: async (loginId, password, consents) => {
      const session = await transport.register(loginId, password, consents);
      await finalizeLogin(session);
      await authStateRepo.setTutorialStatus("pending");
    },
    googleLogin: async (credential, consents) => {
      const session = await transport.googleLogin(credential, consents);
      await finalizeLogin(session);
    },
    appleLogin: async (credential, consents) => {
      const session = await transport.appleLogin(credential, consents);
      await finalizeLogin(session);
    },
    applyExternalSession: async (session) => {
      await transport.persistSession(session);
      await finalizeLogin(session);
    },
    logout: async () => {
      generation++;
      clearOnlineRetry();
      await resetAuthState();
      // ローカル state は必ず clear。サーバー側 clear の成否は呼び出し側で
      // UI 警告等に使うため返す (Web の httpOnly cookie 残存対策)。
      const result = await transport.logout().catch(() => ({ ok: false }));
      return result;
    },
  };
}
