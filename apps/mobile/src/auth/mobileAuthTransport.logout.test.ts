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

describe("mobileAuthTransport.logout", () => {
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
    // 失敗時に SecureStore を消すと X-Refresh-Token を再送できず再試行が通らなくなる
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("network error -> { ok: false } のとき SecureStore は保持される (再試行のため)", async () => {
    mockGetItem.mockResolvedValue("rt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));

    const result = await makeTransport().logout();

    expect(result).toEqual({ ok: false });
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("401 -> refreshSession で refresh token を rotate → 新 X-Refresh-Token で retry して成功", async () => {
    mockGetItem
      .mockResolvedValueOnce("rt-old") // postLogout #1
      .mockResolvedValueOnce("rt-old") // refreshSession (getStoredRefreshToken)
      .mockResolvedValueOnce("rt-new"); // postLogout #2 (retry)
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
    mockGetItem.mockResolvedValue("rt");
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

  it("401 -> refresh が transient (5xx) -> retry せず { ok: false } (再試行可)", async () => {
    mockGetItem.mockResolvedValue("rt");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401)) // /auth/logout
      .mockResolvedValueOnce(emptyResponse(503)); // /auth/token → transient
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeTransport().logout();

    expect(result).toEqual({ ok: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });
});
