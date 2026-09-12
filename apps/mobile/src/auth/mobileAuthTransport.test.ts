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
  emptyResponse,
  jsonResponse,
  makeTransport,
  mockRefreshTokenStorage,
  validSessionBody,
} from "./_mobileAuthTransportTestHelpers";

const mockGetItem = SecureStore.getItemAsync as ReturnType<typeof vi.fn>;
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

describe("mobileAuthTransport.refreshSession", () => {
  it("refresh token 不在 -> { kind: 'expired' } (fetch を呼ばない)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockGetItem.mockResolvedValue(null);

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("200 -> { kind: 'ok' } + 新 refreshToken を SecureStore に保存", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "old-refresh");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            validSessionBody({ token: "new-jwt", refreshToken: "new-refresh" }),
          ),
        ),
    );

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.session.token).toBe("new-jwt");
    }
    expect(mockSetItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, "new-refresh");
  });

  it("401 -> { kind: 'expired' } + SecureStore をクリア", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "expired-refresh");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("expired");
    expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  it("403 -> { kind: 'expired' } + SecureStore をクリア", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(403)));

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("expired");
    expect(mockDeleteItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  it("500 -> { kind: 'transient' } (refresh token は保持する)", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("transient");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("429 -> { kind: 'transient' } + refresh token を保持する", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(429));
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("transient");
    expect(mockDeleteItem).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("network error -> { kind: 'transient' }", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));

    const result = await makeTransport().refreshSession();

    expect(result.kind).toBe("transient");
  });

  it("Bearer ヘッダで refresh token を送る", async () => {
    store.data.set(REFRESH_TOKEN_KEY, "rt-value");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(validSessionBody({ refreshToken: "new-refresh" })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await makeTransport().refreshSession();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiUrl}/auth/token`);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer rt-value");
  });
});
