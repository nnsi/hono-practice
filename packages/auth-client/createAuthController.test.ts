import { createDefaultTabPreference } from "@packages/domain/user/tabPreferenceSchema";
import { describe, expect, it, vi } from "vitest";

import { createAuthController } from "./createAuthController";
import { createAuthenticatedFetch } from "./http/createAuthenticatedFetch";
import type {
  AuthSession,
  AuthStateRepository,
  AuthTransport,
  OnlineRetryAdapter,
  RefreshResult,
} from "./types";

function makeSession(
  userId = "u1",
  plan: "free" | "premium" = "free",
): AuthSession {
  return {
    token: `tok-${userId}`,
    refreshToken: `rt-${userId}`,
    user: {
      id: userId,
      name: null,
      providers: [],
      plan,
      tabPreference: createDefaultTabPreference(),
    },
  };
}

function makeRepo(
  initial?: Partial<{
    userId: string | null;
    lastLoginAt: string | null;
    plan: string | null;
    tutorialStatus: string | null;
  }>,
): AuthStateRepository {
  const store = {
    userId: initial?.userId ?? null,
    lastLoginAt: initial?.lastLoginAt ?? null,
    plan: initial?.plan ?? null,
    tutorialStatus: initial?.tutorialStatus ?? null,
  };
  return {
    getCurrentUserId: async () => store.userId,
    getLastLoginAt: async () => store.lastLoginAt,
    setUserId: async (v) => {
      store.userId = v;
    },
    setLastLoginAt: async (v) => {
      store.lastLoginAt = v;
    },
    setPlan: async (v) => {
      store.plan = v;
    },
    setTutorialStatus: async (v) => {
      store.tutorialStatus = v;
    },
    clearLastLoginAt: async () => {
      store.lastLoginAt = "";
    },
  };
}

type TransportStub = AuthTransport & {
  refreshResults: RefreshResult[];
  loginCalls: number;
  logoutCalls: number;
  accessToken: string | null;
  persistCalls: number;
  clearPersistedCalls: number;
};

function makeTransport(opts?: {
  loginSession?: AuthSession;
  refreshResults?: RefreshResult[];
}): TransportStub {
  const refreshResults = opts?.refreshResults ? [...opts.refreshResults] : [];
  let loginCalls = 0;
  let logoutCalls = 0;
  let accessToken: string | null = null;
  let persistCalls = 0;
  let clearPersistedCalls = 0;
  const session = opts?.loginSession ?? makeSession();
  const t: TransportStub = {
    refreshResults,
    get loginCalls() {
      return loginCalls;
    },
    get logoutCalls() {
      return logoutCalls;
    },
    get accessToken() {
      return accessToken;
    },
    get persistCalls() {
      return persistCalls;
    },
    get clearPersistedCalls() {
      return clearPersistedCalls;
    },
    login: async () => {
      loginCalls++;
      return session;
    },
    register: async () => session,
    googleLogin: async () => session,
    appleLogin: async () => session,
    refreshSession: async () => {
      if (refreshResults.length === 0)
        return { kind: "transient", reason: "no more results" };
      return refreshResults.shift() as RefreshResult;
    },
    logout: async () => {
      logoutCalls++;
      return { ok: true };
    },
    setAccessToken: (token) => {
      accessToken = token;
    },
    persistSession: async (s) => {
      persistCalls++;
      accessToken = s.token;
    },
    clearPersistedSession: async () => {
      clearPersistedCalls++;
    },
  } as TransportStub;
  return t;
}

describe("createAuthController", () => {
  it.each([
    ["u1", 200, 2],
    ["different-user", 401, 1],
  ])("reconcile to %s handles a late API 401 within the session boundary", async (userId, status, requestCount) => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession(userId) }],
    });
    transport.setAccessToken("old-access");
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo({ userId: "u1", lastLoginAt: "x" }),
      performInitialSync: async () => {},
    });
    const refresh = vi.fn();
    const { fetch: apiFetch } = createAuthenticatedFetch({
      tokenSource: { getToken: () => transport.accessToken },
      refreshAccessToken: refresh,
      getSessionVersion: () => controller.getSessionIdentityVersion(),
    });
    let finish!: (res: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const pending = apiFetch("http://localhost/users/activities", {
        method: "PUT",
      });
      expect(await controller.reconcile()).toBe(true);
      finish(new Response(null, { status: 401 }));
      expect((await pending).status).toBe(status);
      expect(fetchMock).toHaveBeenCalledTimes(requestCount);
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("changes the HTTP session boundary as soon as login or logout starts", async () => {
    const transport = makeTransport();
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: async () => {},
    });
    const initial = controller.getSessionIdentityVersion();
    const login = controller.login("id", "pw");
    expect(controller.getSessionIdentityVersion()).toBe(initial + 1);
    await login;
    const beforeLogout = controller.getSessionIdentityVersion();
    const logout = controller.logout();
    expect(controller.getSessionIdentityVersion()).toBe(beforeLogout + 1);
    await logout;
  });

  it("hydrate restores logged-in state when both userId and lastLoginAt exist", async () => {
    const transport = makeTransport();
    const repo = makeRepo({
      userId: "u1",
      lastLoginAt: "2026-05-14T00:00:00Z",
    });
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });

    await controller.hydrate();

    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      isLoading: false,
      userId: "u1",
    });
  });

  it("hydrate stays logged out when lastLoginAt is missing", async () => {
    const transport = makeTransport();
    const repo = makeRepo({ userId: "u1", lastLoginAt: null });
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });

    await controller.hydrate();

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      isLoading: false,
      userId: null,
    });
  });

  it("reconcile applies a successful refresh and sets syncReady", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    const repo = makeRepo();
    const initialSync = vi.fn().mockResolvedValue(undefined);
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: initialSync,
    });

    const ok = await controller.reconcile();

    expect(ok).toBe(true);
    expect(initialSync).toHaveBeenCalledWith("u1");
    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      userId: "u1",
      syncReady: true,
    });
    expect(transport.accessToken).toBe("tok-u1");
  });

  it("reconcile on expired resets auth state but does not retry online", async () => {
    const transport = makeTransport({ refreshResults: [{ kind: "expired" }] });
    const repo = makeRepo({
      userId: "u1",
      lastLoginAt: "2026-05-14T00:00:00Z",
    });
    const registerOnlineRetry = vi.fn();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      online: { registerOnlineRetry },
    });

    await controller.reconcile();

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      syncReady: false,
      userId: null,
    });
    expect(transport.accessToken).toBe(null);
    expect(registerOnlineRetry).not.toHaveBeenCalled();
  });

  it("reconcile on transient schedules an online retry but does NOT reset state", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "transient" }],
    });
    const repo = makeRepo({
      userId: "u1",
      lastLoginAt: "2026-05-14T00:00:00Z",
    });
    const registerOnlineRetry = vi.fn().mockReturnValue(() => {});
    const onAuthStateReset = vi.fn();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      online: { registerOnlineRetry },
      onAuthStateReset,
    });
    await controller.hydrate();

    const ok = await controller.reconcile();

    expect(ok).toBe(false);
    expect(registerOnlineRetry).toHaveBeenCalledOnce();
    expect(onAuthStateReset).not.toHaveBeenCalled();
    // hydrate で立った isLoggedIn は維持される (transient なのでログアウトしない)
    expect(controller.getState().isLoggedIn).toBe(true);
  });

  it("reconcile on thrown error also registers online retry without resetting", async () => {
    const transport: TransportStub = makeTransport();
    transport.refreshSession = async () => {
      throw new Error("network down");
    };
    const repo = makeRepo({
      userId: "u1",
      lastLoginAt: "2026-05-14T00:00:00Z",
    });
    const registerOnlineRetry = vi.fn().mockReturnValue(() => {});
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      online: { registerOnlineRetry },
    });
    await controller.hydrate();

    await controller.reconcile();

    expect(registerOnlineRetry).toHaveBeenCalledOnce();
    expect(controller.getState().isLoggedIn).toBe(true);
  });

  it("initial sync failure keeps the authenticated state and retries until syncReady", async () => {
    const transport = makeTransport({
      refreshResults: [
        { kind: "ok", session: makeSession("u1") },
        { kind: "ok", session: makeSession("u1") },
      ],
    });
    const initialSync = vi
      .fn()
      .mockRejectedValueOnce(new Error("sync unavailable"))
      .mockResolvedValueOnce(undefined);
    const handlerRef: { current: (() => void) | null } = { current: null };
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: initialSync,
      online: {
        registerOnlineRetry(handler) {
          handlerRef.current = handler;
          return () => {
            handlerRef.current = null;
          };
        },
      },
    });

    await expect(controller.reconcile()).resolves.toBe(false);
    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      userId: "u1",
      syncReady: false,
    });
    expect(handlerRef.current).not.toBeNull();

    handlerRef.current?.();
    await vi.waitFor(() => {
      expect(initialSync).toHaveBeenCalledTimes(2);
      expect(controller.getState().syncReady).toBe(true);
    });
  });

  it("ignores an adapter's synchronous connectivity snapshot to avoid a refresh storm", async () => {
    const transport = makeTransport({
      refreshResults: [
        { kind: "transient", reason: "status 503" },
        { kind: "ok", session: makeSession("u1") },
      ],
    });
    const refreshSpy = vi.spyOn(transport, "refreshSession");
    const cleanup = vi.fn();
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: async () => {},
      online: {
        registerOnlineRetry(handler) {
          handler();
          return cleanup;
        },
      },
    });

    await controller.reconcile();
    await Promise.resolve();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    await controller.forceLogout();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("retries a transient refresh on a timer even without an online event", async () => {
    vi.useFakeTimers();
    try {
      const transport = makeTransport({
        refreshResults: [
          { kind: "transient", reason: "status 503" },
          { kind: "ok", session: makeSession("u1") },
        ],
      });
      const refreshSpy = vi.spyOn(transport, "refreshSession");
      const controller = createAuthController({
        transport,
        authStateRepo: makeRepo(),
        performInitialSync: async () => {},
      });

      await controller.reconcile();
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(refreshSpy).toHaveBeenCalledTimes(2);
      expect(controller.getState().syncReady).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("login triggers onUserSwitch when previous userId differs", async () => {
    const transport = makeTransport({
      loginSession: makeSession("new-user"),
    });
    const repo = makeRepo({ userId: "old-user", lastLoginAt: "x" });
    const onUserSwitch = vi.fn().mockResolvedValue(undefined);
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      onUserSwitch,
    });

    await controller.login("id", "pw");

    expect(onUserSwitch).toHaveBeenCalledOnce();
    expect(controller.getState().userId).toBe("new-user");
  });

  it("login does NOT trigger onUserSwitch when previous userId is null", async () => {
    const transport = makeTransport({
      loginSession: makeSession("new-user"),
    });
    const repo = makeRepo({ userId: null });
    const onUserSwitch = vi.fn().mockResolvedValue(undefined);
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      onUserSwitch,
    });

    await controller.login("id", "pw");

    expect(onUserSwitch).not.toHaveBeenCalled();
  });

  it("login 開始時に session version を更新し、logout 後の遅延 login 応答を破棄する", async () => {
    let resolveLogin!: (session: AuthSession) => void;
    const loginSession = new Promise<AuthSession>((resolve) => {
      resolveLogin = resolve;
    });
    const transport = makeTransport();
    transport.login = () => loginSession;
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: async () => {},
    });

    const initialVersion = controller.getSessionVersion();
    const pendingLogin = controller.login("id", "pw");
    expect(controller.getSessionVersion()).toBe(initialVersion + 1);

    await controller.forceLogout();
    resolveLogin(makeSession("late-user"));
    await pendingLogin;

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
      syncReady: false,
    });
    expect(transport.accessToken).toBeNull();
  });

  it("register sets tutorial_status=pending", async () => {
    const transport = makeTransport();
    const repo = makeRepo();
    const setTutorialStatus = vi.fn(repo.setTutorialStatus);
    repo.setTutorialStatus = setTutorialStatus;
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });

    await controller.register("id", "pw", {
      age: true,
      terms: "1",
      privacy: "1",
    });

    expect(setTutorialStatus).toHaveBeenCalledWith("pending");
  });

  it("applyExternalSession persists via transport and finalizes login", async () => {
    const transport = makeTransport();
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });

    await controller.applyExternalSession(makeSession("ext-user"));

    expect(transport.persistCalls).toBe(1);
    expect(controller.getState()).toMatchObject({
      userId: "ext-user",
      isLoggedIn: true,
      syncReady: true,
    });
  });

  it("logout success: transport.logout を先に呼んでから state をリセットする", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    // transport.logout 実行時の access token を記録する (resetAuthState 前の有効値)
    let tokenAtLogout: string | null = "uninitialized";
    const originalLogout = transport.logout;
    transport.logout = async () => {
      tokenAtLogout = transport.accessToken;
      return originalLogout();
    };
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });
    await controller.reconcile();
    expect(controller.getState().isLoggedIn).toBe(true);
    expect(transport.accessToken).not.toBeNull();

    const result = await controller.logout();
    expect(result).toEqual({ ok: true });

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
      syncReady: false,
    });
    expect(transport.logoutCalls).toBe(1);
    // 重要: transport.logout 呼び出し時点で access token がまだ有効だったこと
    // (authMiddleware が Bearer 必須なので resetAuthState 後だと 401 になる)
    expect(tokenAtLogout).not.toBeNull();
    expect(transport.accessToken).toBe(null);
  });

  it("forceLogout は transport.logout を呼ばず local state を強制リセットする", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });
    await controller.reconcile();
    expect(controller.getState().isLoggedIn).toBe(true);

    await controller.forceLogout();

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
      syncReady: false,
    });
    // delete account 用途: backend で user 削除済みなので server cleanup は試みない
    expect(transport.logoutCalls).toBe(0);
    expect(transport.accessToken).toBe(null);
    // 永続層 (Mobile の SecureStore など) も明示的にクリアする
    expect(transport.clearPersistedCalls).toBe(1);
  });

  it("forceLogout は clearPersistedSession が throw しても local state を必ずリセットする", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    transport.clearPersistedSession = async () => {
      throw new Error("SecureStore failed");
    };
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });
    await controller.reconcile();
    expect(controller.getState().isLoggedIn).toBe(true);

    // throw を握りつぶし local state は確実にリセットされる
    await controller.forceLogout();
    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
    });
    expect(transport.accessToken).toBe(null);
  });

  it("logout failure: { ok: false } を返し local state は保持する (httpOnly cookie 残存対策)", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    transport.logout = async () => ({ ok: false });
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });
    await controller.reconcile();
    const userIdBefore = controller.getState().userId;
    const tokenBefore = transport.accessToken;
    expect(userIdBefore).not.toBeNull();
    expect(tokenBefore).not.toBeNull();

    const result = await controller.logout();
    expect(result).toEqual({ ok: false });

    // local state は維持 (UI 側で warning を出して再試行できるよう)
    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      userId: userIdBefore,
      syncReady: true,
    });
    expect(transport.accessToken).toBe(tokenBefore);
  });

  it("logout during reconcile prevents stale syncReady from being written", async () => {
    let resolveSync!: () => void;
    const syncPromise = new Promise<void>((r) => {
      resolveSync = r;
    });
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: () => syncPromise,
    });

    const reconcilePromise = controller.reconcile();
    // performInitialSync が hangup している間に logout が割り込む
    await Promise.resolve();
    await controller.logout();
    // initialSync の Promise を解決すると、reconcile の applySession が再開する
    resolveSync();
    const result = await reconcilePromise;

    expect(result).toBe(false);
    // logout 後の state は logged out のまま (stale な syncReady=true に上書きされない)
    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      syncReady: false,
      userId: null,
    });
    // logout 後の accessToken も null のまま (stale reconcile が書き戻していない)
    expect(transport.accessToken).toBe(null);
  });

  it("遅延 logout 完了後も、後から成立した login session をリセットしない", async () => {
    let resolveLogout!: (result: { ok: boolean }) => void;
    const logoutResult = new Promise<{ ok: boolean }>((resolve) => {
      resolveLogout = resolve;
    });
    const transport = makeTransport({
      loginSession: makeSession("new-user"),
      refreshResults: [{ kind: "ok", session: makeSession("old-user") }],
    });
    transport.logout = () => logoutResult;
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: async () => {},
    });
    await controller.reconcile();

    const pendingLogout = controller.logout();
    await controller.login("new", "pw");
    resolveLogout({ ok: true });
    await pendingLogout;

    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      userId: "new-user",
      syncReady: true,
    });
    expect(transport.accessToken).toBe("tok-new-user");
  });

  it("遅延 forceLogout cleanup 後も、後から成立した login session をリセットしない", async () => {
    let resolveCleanup!: () => void;
    const cleanup = new Promise<void>((resolve) => {
      resolveCleanup = resolve;
    });
    const transport = makeTransport({
      loginSession: makeSession("new-user"),
      refreshResults: [{ kind: "ok", session: makeSession("old-user") }],
    });
    transport.clearPersistedSession = () => cleanup;
    const controller = createAuthController({
      transport,
      authStateRepo: makeRepo(),
      performInitialSync: async () => {},
    });
    await controller.reconcile();

    const pendingForceLogout = controller.forceLogout();
    await controller.login("new", "pw");
    resolveCleanup();
    await pendingForceLogout;

    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      userId: "new-user",
      syncReady: true,
    });
    expect(transport.accessToken).toBe("tok-new-user");
  });

  it("subscribe / unsubscribe correctly notifies listeners", async () => {
    const transport = makeTransport({
      refreshResults: [{ kind: "ok", session: makeSession("u1") }],
    });
    const repo = makeRepo();
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
    });
    const listener = vi.fn();
    const unsub = controller.subscribe(listener);

    await controller.reconcile();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    unsub();
    await controller.logout();
    expect(listener).not.toHaveBeenCalled();
  });

  it("online retry handler is wired and fires reconcile when online", async () => {
    const transport = makeTransport({
      refreshResults: [
        { kind: "transient" },
        { kind: "ok", session: makeSession("u1") },
      ],
    });
    const repo = makeRepo({ userId: "u1", lastLoginAt: "x" });
    const handlerRef: { current: (() => void) | null } = { current: null };
    const online: OnlineRetryAdapter = {
      registerOnlineRetry(h) {
        handlerRef.current = h;
        return () => {
          handlerRef.current = null;
        };
      },
    };
    const controller = createAuthController({
      transport,
      authStateRepo: repo,
      performInitialSync: async () => {},
      online,
    });
    await controller.hydrate();
    await controller.reconcile();
    expect(handlerRef.current).not.toBeNull();

    // online 復帰イベント → reconcile が呼ばれて成功する。reconcile は非同期 chain
    // なので、syncReady=true に到達するまで waitFor で polling 待機する (microtask
    // 数の決め打ちに依存しないので flaky にならない)
    handlerRef.current?.();
    await vi.waitFor(() => {
      expect(controller.getState().syncReady).toBe(true);
    });
  });
});
