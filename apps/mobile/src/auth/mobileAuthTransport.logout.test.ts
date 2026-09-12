import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));
vi.mock("expo-crypto", () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
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

import {
  REFRESH_TOKEN_KEY,
  apiUrl,
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  mockRefreshTokenStorage,
  validSessionBody,
} from "./_mobileAuthTransportTestHelpers";

const mockSetItem = SecureStore.setItemAsync as ReturnType<typeof vi.fn>;
const mockDeleteItem = SecureStore.deleteItemAsync as ReturnType<typeof vi.fn>;
let store: ReturnType<typeof mockRefreshTokenStorage>;

beforeEach(() => {
  vi.clearAllMocks();
  store = mockRefreshTokenStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobileAuthTransport.logout", () => {
  it("200 -> { ok: true } + SecureStore をクリア + Bearer / X-Refresh-Token を送信", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt-logout");
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
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));

    const result = await makeTransport().logout();

    expect(result).toEqual({ ok: false });
    // 失敗時に SecureStore を消すと X-Refresh-Token を再送できず再試行が通らなくなる
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("network error -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));

    const result = await makeTransport().logout();

    expect(result).toEqual({ ok: false });
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("進行中の通常 refresh を待ってから logout し、遅延応答で credential を復活させない", async () => {
    store = mockRefreshTokenStorage("rt-old");

    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/token")) return refreshResponse;
      return Promise.resolve(emptyResponse(200));
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokenHolder = createTokenHolder();
    tokenHolder.setToken("jwt-old");
    const transport = makeTransport({ tokenHolder });

    const apiRefresh = (async () => {
      const result = await transport.refreshSession();
      if (result.kind === "ok") {
        transport.setAccessToken(result.session.token);
      }
    })();
    const controllerLogout = (async () => {
      const result = await transport.logout();
      if (result.ok) transport.setAccessToken(null);
      return result;
    })();

    for (let i = 0; i < 10; i++) await Promise.resolve();
    resolveRefresh(
      jsonResponse(
        validSessionBody({
          token: "jwt-late",
          refreshToken: "rt-late",
        }),
      ),
    );

    const [, logoutResult] = await Promise.all([apiRefresh, controllerLogout]);

    expect(logoutResult).toEqual({ ok: true });
    expect(store.token).toBeNull();
    expect(tokenHolder.getToken()).toBeNull();
  });

  it("進行中 login の永続化後に logout し、遅延 login credential を残さない", async () => {
    store = mockRefreshTokenStorage("rt-old");
    let resolveLogin!: (response: Response) => void;
    const loginResponse = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });
    let logoutCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/login")) return loginResponse;
      if (url.endsWith("/auth/token")) {
        return Promise.resolve(
          jsonResponse(
            validSessionBody({
              token: "jwt-refreshed",
              refreshToken: "rt-refreshed",
            }),
          ),
        );
      }
      logoutCalls++;
      return Promise.resolve(emptyResponse(logoutCalls === 1 ? 401 : 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const login = transport.login("u", "pw");
    const logout = transport.logout();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveLogin(
      jsonResponse(
        validSessionBody({ token: "jwt-login", refreshToken: "rt-login" }),
      ),
    );
    await Promise.all([login, logout]);

    expect(store.token).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${apiUrl}/auth/login`,
      `${apiUrl}/auth/logout`,
      `${apiUrl}/auth/token`,
      `${apiUrl}/auth/logout`,
    ]);
  });

  it("logout 成功を待つ新規 refresh は token endpoint を呼ばず expired になる", async () => {
    store = mockRefreshTokenStorage("rt");
    let resolveLogout!: (response: Response) => void;
    const logoutResponse = new Promise<Response>((resolve) => {
      resolveLogout = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/logout")) return logoutResponse;
      return Promise.resolve(jsonResponse(validSessionBody()));
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const logout = transport.logout();
    const refresh = transport.refreshSession();
    resolveLogout(emptyResponse(200));

    await expect(logout).resolves.toEqual({ ok: true });
    await expect(refresh).resolves.toEqual({ kind: "expired" });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith("/auth/token")),
    ).toBe(false);
  });

  it("logout 失敗を待つ新規 refresh は保持した token で回復を再開する", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    let resolveLogout!: (response: Response) => void;
    const logoutResponse = new Promise<Response>((resolve) => {
      resolveLogout = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/logout")) return logoutResponse;
      return Promise.resolve(
        jsonResponse(
          validSessionBody({ token: "jwt-new", refreshToken: "rt-new" }),
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const logout = transport.logout();
    const refresh = transport.refreshSession();
    resolveLogout(emptyResponse(503));

    await expect(logout).resolves.toEqual({ ok: false });
    await expect(refresh).resolves.toMatchObject({ kind: "ok" });
    expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt-new");
  });

  it("401 -> refreshSession で refresh token を rotate → 新 X-Refresh-Token で retry して成功", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt-old");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout (initial)
      .mockResolvedValueOnce(
        jsonResponse({
          token: "new-jwt",
          refreshToken: "rt-new",
          user: validSessionBody().user,
        }),
      ) // /auth/token rotation
      .mockResolvedValueOnce(emptyResponse(200)); // /auth/logout (retry)
    vi.stubGlobal("fetch", fetchMock);

    const tokenHolder = createTokenHolder();
    tokenHolder.setToken("expired-jwt");
    const transport = makeTransport({ tokenHolder });

    const result = await transport.logout();

    expect(result).toEqual({ ok: true });
    expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt-new");
    expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);

    // retry リクエストは Bearer = new-jwt, X-Refresh-Token = rt-new
    const [, retryInit] = fetchMock.mock.calls[2];
    const retryHeaders = (retryInit as RequestInit).headers as Record<
      string,
      string
    >;
    expect(retryHeaders.Authorization).toBe("Bearer new-jwt");
    expect(retryHeaders["X-Refresh-Token"]).toBe("rt-new");
    expect(tokenHolder.getToken()).toBe("new-jwt");
  });

  it("401 -> refresh も expired -> backend に session 無いので { ok: true } 扱い (state stuck 回避)", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout
      .mockResolvedValueOnce(emptyResponse(401)); // /auth/token → expired
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeTransport().logout();

    // expired = backend 側に session が無い = ログアウト達成済みと等価
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // SecureStore: refreshSession の expired 分岐 + logout の cleanup
    expect(mockDeleteItem).toHaveBeenCalledTimes(2);
  });

  it("401 -> refresh の再送も transient (5xx) -> logout は再送せず { ok: false }", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout
      .mockResolvedValueOnce(emptyResponse(503)) // /auth/token retry 前
      .mockResolvedValueOnce(emptyResponse(503)); // /auth/token → transient
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeTransport().logout();

    expect(result).toEqual({ ok: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });
});
