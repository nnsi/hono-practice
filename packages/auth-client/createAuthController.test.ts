import { createDefaultTabPreference } from "@packages/domain/user/tabPreferenceSchema";
import { describe, expect, it, vi } from "vitest";

import { createAuthController } from "./createAuthController";
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
  } as TransportStub;
  return t;
}

describe("createAuthController", () => {
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

  it("logout clears state and calls transport.logout fire-and-forget", async () => {
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

    await controller.logout();

    expect(controller.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
      syncReady: false,
    });
    // logout は内部で fire-and-forget なので 1 マイクロタスク待って transport を確認
    await Promise.resolve();
    expect(transport.logoutCalls).toBe(1);
    expect(transport.accessToken).toBe(null);
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
