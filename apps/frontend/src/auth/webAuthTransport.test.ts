import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));

import {
  apiUrl,
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  validSessionBody,
} from "./_webAuthTransportTestHelpers";

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

      // POST /auth/token + credentials: include
      expect(fetchMock).toHaveBeenCalledWith(
        `${apiUrl}/auth/token`,
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      );
    });

    it("401 -> { kind: 'expired' } (session 復元不能)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("expired");
    });

    it("403 -> { kind: 'expired' } (session 復元不能)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(403)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("expired");
    });

    it("500 -> { kind: 'transient' } (一時障害)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
      const transport = makeTransport();

      const result = await transport.refreshSession();
      expect(result.kind).toBe("transient");
    });
  });

  describe("login", () => {
    it("200 + token -> session を返す", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(validSessionBody("login-jwt"))),
      );
      const transport = makeTransport();

      const session = await transport.login("user", "pw");
      expect(session.token).toBe("login-jwt");
    });

    it("401 -> invalidCredentials エラー", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));
      const transport = makeTransport();

      await expect(transport.login("user", "pw")).rejects.toThrow(
        "common:api.invalidCredentials",
      );
    });

    it("500 -> serverError エラー", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
      const transport = makeTransport();

      await expect(transport.login("user", "pw")).rejects.toThrow(
        "common:api.serverError",
      );
    });

    it("network error -> networkError エラー", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );
      const transport = makeTransport();

      await expect(transport.login("user", "pw")).rejects.toThrow(
        "common:api.networkError",
      );
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

      expect(tokenHolder.getToken()).toBe("kept-jwt");
    });
  });
});
