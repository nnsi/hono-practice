import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import * as SecureStore from "expo-secure-store";

import { createMobileAuthTransport } from "./mobileAuthTransport";

const apiUrl = "http://localhost:3456";
const REFRESH_TOKEN_KEY = "actiko-refresh-token";

const mockGetItem = SecureStore.getItemAsync as ReturnType<typeof vi.fn>;
const mockSetItem = SecureStore.setItemAsync as ReturnType<typeof vi.fn>;
const mockDeleteItem = SecureStore.deleteItemAsync as ReturnType<typeof vi.fn>;

function createTokenHolder() {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string | null) => {
      token = t;
    },
  };
}

// 既存テストは vi.stubGlobal("fetch", ...) で global fetch を mock する前提なので、
// authenticatedFetch も global fetch にデリゲートする実装をデフォルトにする。
// logout のテストだけは authenticatedFetch を直接 mock したいので opts で override
function makeTransport(opts?: {
  tokenHolder?: ReturnType<typeof createTokenHolder>;
  authenticatedFetch?: typeof fetch;
}) {
  const authenticatedFetch =
    opts?.authenticatedFetch ?? ((input, init) => fetch(input, init));
  return createMobileAuthTransport(
    { apiUrl, authenticatedFetch },
    opts?.tokenHolder ?? createTokenHolder(),
  );
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

function validSessionBody(opts?: { token?: string; refreshToken?: string }) {
  return {
    token: opts?.token ?? "jwt-token",
    refreshToken: opts?.refreshToken,
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
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobileAuthTransport", () => {
  describe("refreshSession", () => {
    it("refresh token 不在 -> { kind: 'expired' } (fetch を呼ばない)", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      mockGetItem.mockResolvedValue(null);

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("expired");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("200 -> { kind: 'ok' } + 新 refreshToken を SecureStore に保存", async () => {
      mockGetItem.mockResolvedValue("old-refresh");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            validSessionBody({
              token: "new-jwt",
              refreshToken: "new-refresh",
            }),
          ),
        ),
      );

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("ok");
      if (result.kind === "ok") {
        expect(result.session.token).toBe("new-jwt");
      }
      expect(mockSetItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        "new-refresh",
      );
    });

    it("401 -> { kind: 'expired' } + SecureStore をクリア", async () => {
      mockGetItem.mockResolvedValue("expired-refresh");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("expired");
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    });

    it("403 -> { kind: 'expired' } + SecureStore をクリア", async () => {
      mockGetItem.mockResolvedValue("rt");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(403)));

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("expired");
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    });

    it("500 -> { kind: 'transient' } (refresh token は保持する)", async () => {
      mockGetItem.mockResolvedValue("rt");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("transient");
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it("network error -> { kind: 'transient' }", async () => {
      mockGetItem.mockResolvedValue("rt");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );

      const transport = makeTransport();

      const result = await transport.refreshSession();

      expect(result.kind).toBe("transient");
    });

    it("Bearer ヘッダで refresh token を送る", async () => {
      mockGetItem.mockResolvedValue("rt-value");
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(validSessionBody()));
      vi.stubGlobal("fetch", fetchMock);

      const transport = makeTransport();
      await transport.refreshSession();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${apiUrl}/auth/token`);
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer rt-value");
    });
  });

  describe("login", () => {
    it("200 -> session を返し、tokenHolder は更新しない (controller の責務)", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse(
              validSessionBody({ token: "login-jwt", refreshToken: "rt" }),
            ),
          ),
      );

      const tokenHolder = createTokenHolder();
      const transport = makeTransport({ tokenHolder });

      const session = await transport.login("u", "pw");

      expect(session.token).toBe("login-jwt");
      // transport.login は tokenHolder.setToken を呼ばない
      expect(tokenHolder.getToken()).toBeNull();
      // refresh token は永続化される (token 二重設定を避けつつ refresh token は保存)
      expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt");
    });

    it("401 -> invalidCredentials", async () => {
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
    it("authenticatedFetch 経由で /auth/logout を呼び成功時 SecureStore をクリア + X-Refresh-Token を付与", async () => {
      mockGetItem.mockResolvedValue("rt-logout");
      const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(200));
      const transport = makeTransport({ authenticatedFetch: authFetchMock });

      const result = await transport.logout();

      expect(result).toEqual({ ok: true });
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
      // X-Refresh-Token は authenticatedFetch が付与しないので transport 側で明示的に乗せる
      expect(authFetchMock).toHaveBeenCalledWith(
        `${apiUrl}/auth/logout`,
        expect.objectContaining({
          method: "POST",
          headers: { "X-Refresh-Token": "rt-logout" },
        }),
      );
    });

    it("500 -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
      mockGetItem.mockResolvedValue("rt");
      const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(500));
      const transport = makeTransport({ authenticatedFetch: authFetchMock });

      const result = await transport.logout();
      expect(result).toEqual({ ok: false });
      // 失敗時に SecureStore を消すと X-Refresh-Token を再送できず
      // logout 再試行が通らなくなるため、ここでは clear しない
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it("network error -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
      mockGetItem.mockResolvedValue("rt");
      const authFetchMock = vi.fn().mockRejectedValue(new TypeError("network"));
      const transport = makeTransport({ authenticatedFetch: authFetchMock });

      const result = await transport.logout();
      expect(result).toEqual({ ok: false });
      expect(mockDeleteItem).not.toHaveBeenCalled();
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

    it("persistSession は refresh token のみを SecureStore に保存し、tokenHolder は更新しない", async () => {
      const tokenHolder = createTokenHolder();
      const transport = makeTransport({ tokenHolder });

      await transport.persistSession({
        token: "ignored-jwt",
        refreshToken: "persisted-rt",
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

      expect(mockSetItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        "persisted-rt",
      );
      // 二重設定回避: persistSession は tokenHolder を更新しない
      expect(tokenHolder.getToken()).toBeNull();
    });

    it("persistSession は refreshToken が無ければ SecureStore に書かない", async () => {
      const transport = makeTransport();

      await transport.persistSession({
        token: "jwt",
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

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("clearPersistedSession は SecureStore の refresh token を削除する", async () => {
      const transport = makeTransport();

      await transport.clearPersistedSession();

      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    });
  });
});
