import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({ i18next: { t: (key: string) => key } }));
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
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import * as SecureStore from "expo-secure-store";

import { mockRefreshTokenStorage } from "./_mobileAuthTransportTestHelpers";
import {
  REFRESH_SESSION_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredRefreshToken,
  getStoredRefreshSession,
  getStoredRefreshToken,
  setStoredRefreshSession,
  setStoredRefreshToken,
} from "./refreshTokenStorage";

const operationId = "37f0a589-7be1-4a60-909d-e75bd65e0eca";
let store: ReturnType<typeof mockRefreshTokenStorage>;
beforeEach(() => {
  vi.resetAllMocks();
  store = mockRefreshTokenStorage("legacy-refresh");
});

describe("refresh credential v2 storage", () => {
  it("migrates a legacy token on the first operation write without changing the v1 format", async () => {
    expect(await getStoredRefreshToken()).toBe("legacy-refresh");
    await setStoredRefreshSession({
      version: 2,
      refreshToken: "legacy-refresh",
      pendingOperationId: operationId,
    });
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "legacy-refresh",
      pendingOperationId: operationId,
    });
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("legacy-refresh");
    expect(store.data.get(REFRESH_TOKEN_KEY)).not.toContain(operationId);
  });

  it("public set replaces the credential and invalidates its old operation", async () => {
    await setStoredRefreshSession({
      version: 2,
      refreshToken: "old",
      pendingOperationId: operationId,
    });
    await setStoredRefreshToken("new-login");
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "new-login",
      pendingOperationId: null,
    });
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("new-login");
  });

  it("v2 is authoritative even when the legacy mirror has another value", async () => {
    await setStoredRefreshToken("current-refresh");
    store.data.set(REFRESH_TOKEN_KEY, "stale-refresh");
    expect(await getStoredRefreshToken()).toBe("current-refresh");
  });

  it.each([
    "not-json",
    JSON.stringify({
      version: 1,
      refreshToken: "wrong-version",
      pendingOperationId: null,
    }),
    JSON.stringify({
      version: 2,
      refreshToken: "token",
      pendingOperationId: "invalid",
    }),
    JSON.stringify({
      version: 2,
      refreshToken: null,
      pendingOperationId: operationId,
    }),
  ])("does not fall back to a stale legacy token when v2 is corrupt: %s", async (raw) => {
    store.data.set(REFRESH_SESSION_KEY, raw);
    await expect(getStoredRefreshToken()).rejects.toThrow();
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("legacy-refresh");
  });

  it("does not update the rollback mirror when the authoritative write fails", async () => {
    vi.mocked(SecureStore.setItemAsync).mockRejectedValue(
      new Error("unavailable"),
    );
    await expect(setStoredRefreshToken("new-refresh")).rejects.toThrow(
      "unavailable",
    );
    expect(store.data.has(REFRESH_SESSION_KEY)).toBe(false);
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("legacy-refresh");
  });

  it("preserves a committed v2 credential when its compatibility mirror fails", async () => {
    vi.mocked(SecureStore.setItemAsync).mockImplementation(
      async (key, value) => {
        if (key === REFRESH_TOKEN_KEY) throw new Error("mirror unavailable");
        await store.write(key, value);
      },
    );
    await setStoredRefreshToken("new-refresh");
    expect(await getStoredRefreshToken()).toBe("new-refresh");
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("legacy-refresh");
  });

  it("keeps a tombstone when legacy deletion fails so old credentials cannot reappear", async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockRejectedValue(
      new Error("delete failed"),
    );
    await clearStoredRefreshToken();
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: null,
      pendingOperationId: null,
    });
    expect(await getStoredRefreshToken()).toBeNull();
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("legacy-refresh");
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith(
      REFRESH_SESSION_KEY,
    );
  });
});
