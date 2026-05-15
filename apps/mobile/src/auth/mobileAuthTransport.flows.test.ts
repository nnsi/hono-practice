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

import {
  REFRESH_TOKEN_KEY,
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  validSessionBody,
} from "./_mobileAuthTransportTestHelpers";

const mockGetItem = SecureStore.getItemAsync as ReturnType<typeof vi.fn>;
const mockSetItem = SecureStore.setItemAsync as ReturnType<typeof vi.fn>;
const mockDeleteItem = SecureStore.deleteItemAsync as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
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
