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

// すべての HTTP は vi.stubGlobal("fetch", ...) で global fetch を mock する
function makeTransport(opts?: {
  tokenHolder?: ReturnType<typeof createTokenHolder>;
}) {
  return createMobileAuthTransport(
    { apiUrl },
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
    it("200 -> { ok: true } + SecureStore をクリア + Bearer / X-Refresh-Token を送信", async () => {
      mockGetItem.mockResolvedValue("rt-logout");
      const fetchMock = vi.fn().mockResolvedValue(emptyResponse(200));
      vi.stubGlobal("fetch", fetchMock);

      const tokenHolder = createTokenHolder();
      tokenHolder.setToken("jwt-access");
      const transport = makeTransport({ tokenHolder });

      const result = await transport.logout();

      expect(result).toEqual({ ok: true });
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);

      const [, init] = fetchMock.mock.calls[0];
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers["X-Refresh-Token"]).toBe("rt-logout");
      expect(headers.Authorization).toBe("Bearer jwt-access");
    });

    it("500 -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
      mockGetItem.mockResolvedValue("rt");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));

      const result = await makeTransport().logout();

      expect(result).toEqual({ ok: false });
      // 失敗時に SecureStore を消すと X-Refresh-Token を再送できず
      // logout 再試行が通らなくなるため、ここでは clear しない
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it("network error -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
      mockGetItem.mockResolvedValue("rt");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("network")),
      );

      const result = await makeTransport().logout();

      expect(result).toEqual({ ok: false });
      expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it("401 -> refreshSession で refresh token を rotate → 新 X-Refresh-Token で retry して成功", async () => {
      // initial: rt-old. /auth/token rotation 後: rt-new。logout retry では rt-new を使う
      mockGetItem
        .mockResolvedValueOnce("rt-old") // postLogout #1
        .mockResolvedValueOnce("rt-old") // refreshSession (getStoredRefreshToken)
        .mockResolvedValueOnce("rt-new"); // postLogout #2 (retry)
      const fetchMock = vi
        .fn()
        // 1: /auth/logout (initial) → 401 (expired access token)
        .mockResolvedValueOnce(emptyResponse(401))
        // 2: /auth/token (refresh) → 200 + 新 access token + rotated refresh token
        .mockResolvedValueOnce(
          jsonResponse({
            token: "new-jwt",
            refreshToken: "rt-new",
            user: validSessionBody().user,
          }),
        )
        // 3: /auth/logout (retry) → 200
        .mockResolvedValueOnce(emptyResponse(200));
      vi.stubGlobal("fetch", fetchMock);

      const tokenHolder = createTokenHolder();
      tokenHolder.setToken("expired-jwt");
      const transport = makeTransport({ tokenHolder });

      const result = await transport.logout();

      expect(result).toEqual({ ok: true });
      // SecureStore: rt-new に書き換え → cleanup の deleteItem
      expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt-new");
      expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);

      // retry リクエストでは Bearer = new-jwt, X-Refresh-Token = rt-new
      const [, retryInit] = fetchMock.mock.calls[2];
      const retryHeaders = (retryInit as RequestInit).headers as Record<
        string,
        string
      >;
      expect(retryHeaders.Authorization).toBe("Bearer new-jwt");
      expect(retryHeaders["X-Refresh-Token"]).toBe("rt-new");
      // tokenHolder も新値に
      expect(tokenHolder.getToken()).toBe("new-jwt");
    });

    it("401 -> refresh も expired -> backend に session 無いので { ok: true } 扱い (state stuck 回避)", async () => {
      mockGetItem.mockResolvedValue("rt");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout
        .mockResolvedValueOnce(emptyResponse(401)); // /auth/token → expired
      vi.stubGlobal("fetch", fetchMock);

      const result = await makeTransport().logout();

      // expired = backend 側に session が無い = ログアウト達成済みと等価。
      // { ok: false } で返すと controller が local state を保持し、SecureStore は
      // refreshSession が消した後なので再試行不能になる
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // SecureStore: refreshSession の expired 分岐 + logout の serverOk=true 後の cleanup
      expect(mockDeleteItem).toHaveBeenCalledTimes(2);
    });

    it("401 -> refresh が transient (5xx) -> retry せず { ok: false } (再試行可)", async () => {
      mockGetItem.mockResolvedValue("rt");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout
        .mockResolvedValueOnce(emptyResponse(503)); // /auth/token → transient
      vi.stubGlobal("fetch", fetchMock);

      const result = await makeTransport().logout();

      // 5xx は backend の一時障害扱い。SecureStore も refresh token も保持
      expect(result).toEqual({ ok: false });
      expect(fetchMock).toHaveBeenCalledTimes(2);
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
