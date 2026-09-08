import {
  createAuthController,
  createAuthenticatedFetch,
  createRefreshAccessTokenCallback,
} from "@packages/auth-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  validSessionBody,
} from "./_webAuthTransportTestHelpers";

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Web の認証更新の復旧", () => {
  it.each([408, 429])("%i で起動時の認証情報を消さない", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => emptyResponse(status)),
    );
    const clearLastLoginAt = vi.fn();
    const controller = createAuthController({
      transport: makeTransport(),
      authStateRepo: {
        getCurrentUserId: async () => "user-1",
        getLastLoginAt: async () => "2026-09-08T00:00:00Z",
        setUserId: vi.fn(),
        setLastLoginAt: vi.fn(),
        setPlan: vi.fn(),
        setTutorialStatus: vi.fn(),
        clearLastLoginAt,
      },
      performInitialSync: vi.fn(),
    });
    await controller.hydrate();
    expect(await controller.reconcile()).toBe(false);
    expect(controller.getState().isLoggedIn).toBe(true);
    expect(clearLastLoginAt).not.toHaveBeenCalled();
  });

  it("起動と API の 401 が同時でも、一度の更新で両方を復旧する", async () => {
    const holder = createTokenHolder();
    holder.setToken("expired");
    let callback: () => Promise<string | null> = async () => null;
    const { fetch: apiFetch } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: () => callback(),
    });
    const transport = makeTransport({
      tokenHolder: holder,
    });
    callback = createRefreshAccessTokenCallback(transport);
    let finishRefresh!: (res: Response) => void;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/token")) {
        return new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        });
      }
      return new Headers(init.headers).get("Authorization") ===
        "Bearer refreshed"
        ? new Response("ok")
        : emptyResponse(401);
    });
    vi.stubGlobal("fetch", fetchMock);
    const sync = vi.fn();
    const controller = createAuthController({
      transport,
      authStateRepo: {
        getCurrentUserId: async () => "user-1",
        getLastLoginAt: async () => "2026-09-08T00:00:00Z",
        setUserId: vi.fn(),
        setLastLoginAt: vi.fn(),
        setPlan: vi.fn(),
        setTutorialStatus: vi.fn(),
        clearLastLoginAt: vi.fn(),
      },
      performInitialSync: sync,
    });
    const startup = controller.reconcile();
    const api = apiFetch("http://localhost/users/me");
    await vi.waitFor(() => expect(finishRefresh).toBeDefined());
    finishRefresh(jsonResponse(validSessionBody("refreshed")));
    expect(await startup).toBe(true);
    expect((await api).status).toBe(200);
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/token")),
    ).toHaveLength(1);
    expect(controller.getState()).toMatchObject({
      isLoggedIn: true,
      syncReady: true,
    });
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("異なるタブの更新を、応答 body の受信完了まで直列化する", async () => {
    let tail: Promise<unknown> = Promise.resolve();
    const lockNames: string[] = [];
    vi.stubGlobal("navigator", {
      locks: {
        request(name: string, callback: () => Promise<unknown>) {
          lockNames.push(name);
          const result = tail.then(callback);
          tail = result;
          return result;
        },
      },
    });
    let finishBody!: () => void;
    const body = new ReadableStream({
      start(controller) {
        finishBody = () => {
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify(validSessionBody())),
          );
          controller.close();
        };
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(body))
      .mockImplementation(async () => jsonResponse(validSessionBody()));
    vi.stubGlobal("fetch", fetchMock);
    const first = makeTransport().refreshSession();
    const second = makeTransport().refreshSession();
    const third = makeTransport().refreshSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    finishBody();
    expect(
      (await Promise.all([first, second, third])).map((result) => result.kind),
    ).toEqual(["ok", "ok", "ok"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Set(lockNames).size).toBe(1);
  });
});
