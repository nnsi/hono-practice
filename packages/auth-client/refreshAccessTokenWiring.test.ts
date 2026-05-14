import { describe, expect, it } from "vitest";

import { createRefreshAccessTokenCallback } from "./refreshAccessTokenWiring";
import type { AuthSession, AuthTransport } from "./types";

function makeSession(token = "new-jwt"): AuthSession {
  return {
    token,
    user: {
      id: "u1",
      name: null,
      providers: [],
      plan: "free",
      tabPreference: {
        tabs: ["home"],
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
    },
  };
}

function makeTransport(opts: {
  refresh: () => Promise<Awaited<ReturnType<AuthTransport["refreshSession"]>>>;
}): AuthTransport & { setAccessTokenCalls: (string | null)[] } {
  const setAccessTokenCalls: (string | null)[] = [];
  return {
    setAccessTokenCalls,
    login: async () => makeSession(),
    register: async () => makeSession(),
    googleLogin: async () => makeSession(),
    appleLogin: async () => makeSession(),
    refreshSession: opts.refresh,
    logout: async () => ({ ok: true }),
    setAccessToken: (token) => {
      setAccessTokenCalls.push(token);
    },
    persistSession: async () => {},
    clearPersistedSession: async () => {},
  } as AuthTransport & { setAccessTokenCalls: (string | null)[] };
}

describe("createRefreshAccessTokenCallback", () => {
  it("refresh 成功時: transport.setAccessToken を呼び新 token を返す", async () => {
    const transport = makeTransport({
      refresh: async () => ({ kind: "ok", session: makeSession("fresh-jwt") }),
    });
    const callback = createRefreshAccessTokenCallback(transport);

    const result = await callback();

    expect(result).toBe("fresh-jwt");
    // 401 retry 経由の本リクエストだけでなく後続リクエストも新 token で送るため
    expect(transport.setAccessTokenCalls).toEqual(["fresh-jwt"]);
  });

  it("refresh kind: expired 時: setAccessToken を呼ばず null を返す", async () => {
    const transport = makeTransport({
      refresh: async () => ({ kind: "expired" }),
    });
    const callback = createRefreshAccessTokenCallback(transport);

    const result = await callback();

    expect(result).toBeNull();
    expect(transport.setAccessTokenCalls).toEqual([]);
  });

  it("refresh kind: transient 時: setAccessToken を呼ばず null を返す", async () => {
    const transport = makeTransport({
      refresh: async () => ({ kind: "transient", reason: "status 500" }),
    });
    const callback = createRefreshAccessTokenCallback(transport);

    expect(await callback()).toBeNull();
    expect(transport.setAccessTokenCalls).toEqual([]);
  });

  it("transport.refreshSession が throw した場合は callback も throw する (controller 側で握る前提)", async () => {
    const transport = makeTransport({
      refresh: async () => {
        throw new Error("network");
      },
    });
    const callback = createRefreshAccessTokenCallback(transport);

    await expect(callback()).rejects.toThrow("network");
  });

  it("setAccessToken と return token は同じ値である (回帰: 片方だけ書き換えるバグを検出)", async () => {
    const transport = makeTransport({
      refresh: async () => ({ kind: "ok", session: makeSession("same-jwt") }),
    });
    const callback = createRefreshAccessTokenCallback(transport);

    const returned = await callback();

    expect(returned).toBe("same-jwt");
    expect(transport.setAccessTokenCalls[0]).toBe("same-jwt");
  });
});
