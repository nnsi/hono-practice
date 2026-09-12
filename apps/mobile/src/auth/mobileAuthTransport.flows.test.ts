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

describe("mobileAuthTransport.login", () => {
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
    // refresh token は永続化される
    expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt");
  });

  it("進行中 refresh の永続化後に login を送り、新しい refresh token を最後に保存する", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt-old");
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/token")) return refreshResponse;
      return Promise.resolve(
        jsonResponse(
          validSessionBody({ token: "jwt-login", refreshToken: "rt-login" }),
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const refresh = transport.refreshSession();
    const login = transport.login("u", "pw");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    resolveRefresh(
      jsonResponse(
        validSessionBody({
          token: "jwt-refreshed",
          refreshToken: "rt-refreshed",
        }),
      ),
    );
    await Promise.all([refresh, login]);

    expect(
      mockSetItem.mock.calls
        .filter(([key]) => key === REFRESH_TOKEN_KEY)
        .map(([, token]) => token),
    ).toEqual(["rt-old", "rt-refreshed", "rt-login"]);
    expect(store.token).toBe("rt-login");
  });

  it("401 -> invalidCredentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));

    await expect(makeTransport().login("u", "wrong")).rejects.toThrow(
      "common:api.invalidCredentials",
    );
  });

  it("500 -> serverError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));

    await expect(makeTransport().login("u", "p")).rejects.toThrow(
      "common:api.serverError",
    );
  });

  it("network error -> networkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));

    await expect(makeTransport().login("u", "p")).rejects.toThrow(
      "common:api.networkError",
    );
  });
});

describe("mobileAuthTransport.setAccessToken / persistSession", () => {
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
      refreshToken: "rt-persisted",
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

    // 二重設定回避: persistSession は tokenHolder を更新しない
    expect(tokenHolder.getToken()).toBeNull();
    expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "rt-persisted");
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
    await makeTransport().clearPersistedSession();

    expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });
});
