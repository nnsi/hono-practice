import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));

import { createWebAuthTransport } from "./webAuthTransport";

const apiUrl = "http://localhost:3456";

// 既存テストは vi.stubGlobal("fetch", ...) で global fetch を mock する前提なので、
// authenticatedFetch も global fetch にデリゲートする実装をデフォルトにする。
// logout のテストだけは authenticatedFetch を直接 mock したいので opts で override
function makeTransport(opts?: {
  tokenHolder?: {
    getToken: () => string | null;
    setToken: (t: string | null) => void;
  };
  authenticatedFetch?: typeof fetch;
}) {
  const authenticatedFetch =
    opts?.authenticatedFetch ?? ((input, init) => fetch(input, init));
  return createWebAuthTransport(
    { apiUrl, authenticatedFetch },
    opts?.tokenHolder ?? createTokenHolder(),
  );
}

function createTokenHolder() {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string | null) => {
      token = t;
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

function validSessionBody(token = "jwt-token") {
  return {
    token,
    user: {
      id: "user-1",
      name: "Test",
      providers: [],
      plan: "free",
      tabPreference: {
        tabs: ["home", "daily", "stats", "goals", "tasks"],
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webAuthTransport", () => {
  describe("refreshSession", () => {
    it("200 -> { kind: 'ok', session }", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(validSessionBody("new-jwt")));
      vi.stubGlobal("fetch", fetchMock);

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("ok");
      if (result.kind === "ok") {
        expect(result.session.token).toBe("new-jwt");
        expect(result.session.user.id).toBe("user-1");
      }
      // credentials: include + /auth/token に POST
      const [, init] = fetchMock.mock.calls[0];
      expect(fetchMock.mock.calls[0][0]).toBe(`${apiUrl}/auth/token`);
      expect((init as RequestInit).method).toBe("POST");
      expect((init as RequestInit).credentials).toBe("include");
    });

    it("401 -> { kind: 'expired' }", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("expired");
    });

    it("403 -> { kind: 'expired' }", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(403)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("expired");
    });

    it("500 -> { kind: 'transient' }", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("transient");
    });

    it("network error -> 例外を propagate (controller 側で online retry にハンドリング)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );
      const transport = makeTransport();

      await expect(transport.refreshSession()).rejects.toThrow();
    });
  });

  describe("login", () => {
    it("200 -> session を返し、tokenHolder は更新しない (controller が反映する)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(validSessionBody("login-jwt"))),
      );
      const tokenHolder = createTokenHolder();
      const transport = makeTransport({ tokenHolder });

      const session = await transport.login("u@example.com", "pw");

      expect(session.token).toBe("login-jwt");
      // 重要: transport.login は tokenHolder.setToken を呼ばない (setAccessToken の責務)
      expect(tokenHolder.getToken()).toBeNull();
    });

    it("401 -> invalidCredentials エラーを throw", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));
      const transport = makeTransport();

      await expect(transport.login("u", "wrong")).rejects.toThrow(
        "common:api.invalidCredentials",
      );
    });

    it("500 -> serverError", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
      const transport = makeTransport();

      await expect(transport.login("u", "p")).rejects.toThrow(
        "common:api.serverError",
      );
    });

    it("network error -> networkError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );
      const transport = makeTransport();

      await expect(transport.login("u", "p")).rejects.toThrow(
        "common:api.networkError",
      );
    });
  });

  describe("logout", () => {
    it("200 -> { ok: true }", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(200)));
      const transport = makeTransport();

      expect(await transport.logout()).toEqual({ ok: true });
    });

    it("500 -> { ok: false } (cookie 残存の警告対象)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
      const transport = makeTransport();

      expect(await transport.logout()).toEqual({ ok: false });
    });

    it("network error -> { ok: false }", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );
      const transport = makeTransport();

      expect(await transport.logout()).toEqual({ ok: false });
    });

    it("authenticatedFetch 経由で /auth/logout を呼ぶ (Bearer 自動付与 + 401 retry を担う)", async () => {
      // logout は authenticatedFetch を直接使うので、global fetch ではなく
      // authenticatedFetch mock 自体に対する呼び出しを検証する
      const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(200));
      const transport = makeTransport({ authenticatedFetch: authFetchMock });

      const result = await transport.logout();

      expect(result).toEqual({ ok: true });
      expect(authFetchMock).toHaveBeenCalledWith(
        `${apiUrl}/auth/logout`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("authenticatedFetch が 401 を返すと { ok: false } (内部で refresh retry も尽きた場合)", async () => {
      const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(401));
      const transport = makeTransport({ authenticatedFetch: authFetchMock });

      expect(await transport.logout()).toEqual({ ok: false });
    });
  });

  describe("setAccessToken / persistSession", () => {
    it("setAccessToken は tokenHolder を更新する", () => {
      const tokenHolder = createTokenHolder();
      const transport = makeTransport({ tokenHolder });

      transport.setAccessToken("set-jwt");
      expect(tokenHolder.getToken()).toBe("set-jwt");

      transport.setAccessToken(null);
      expect(tokenHolder.getToken()).toBeNull();
    });

    it("persistSession は no-op (Web は cookie 自動反映、メモリ反映は setAccessToken が担う)", async () => {
      const tokenHolder = createTokenHolder();
      const transport = makeTransport({ tokenHolder });

      await transport.persistSession({
        token: "ignored",
        user: {
          id: "u",
          name: null,
          providers: [],
          plan: "free",
          tabPreference: {
            tabs: ["home"],
            updatedAt: "2026-05-14T10:00:00.000Z",
          },
        },
      });

      // persistSession は tokenHolder を更新しない (二重設定回避)
      expect(tokenHolder.getToken()).toBeNull();
    });

    it("clearPersistedSession は no-op (Web は httpOnly cookie のため JS から削除不能)", async () => {
      const tokenHolder = createTokenHolder();
      tokenHolder.setToken("kept-jwt");
      const transport = makeTransport({ tokenHolder });

      await transport.clearPersistedSession();

      // 副作用がないことを確認 (tokenHolder への影響なし)
      expect(tokenHolder.getToken()).toBe("kept-jwt");
    });
  });
});
