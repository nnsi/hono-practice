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
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import * as SecureStore from "expo-secure-store";

import {
  REFRESH_SESSION_KEY,
  REFRESH_TOKEN_KEY,
  emptyResponse,
  failCredentialWrites,
  jsonResponse,
  makeTransport,
  mockRefreshTokenStorage,
  validSessionBody,
} from "./_mobileAuthTransportTestHelpers";

const mockSetItem = vi.mocked(SecureStore.setItemAsync);
const mockDeleteItem = vi.mocked(SecureStore.deleteItemAsync);
let store: ReturnType<typeof mockRefreshTokenStorage>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  store = mockRefreshTokenStorage("old-refresh");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("mobile refresh recovery", () => {
  it.each([
    "network",
    408,
    503,
  ])("%s の直後は同じ token で一度再送して復旧する", async (failure) => {
    const fetchMock = vi.fn();
    if (failure === "network") {
      fetchMock.mockRejectedValueOnce(new TypeError("connection lost"));
    } else {
      fetchMock.mockResolvedValueOnce(emptyResponse(Number(failure)));
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse(validSessionBody({ refreshToken: "recovered-refresh" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init.headers).get("Authorization")).toBe(
        "Bearer old-refresh",
      );
    }
    expect(store.token).toBe("recovered-refresh");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("headers 受信後に body が止まっても 15 秒で再送して復旧する", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: string, init?: RequestInit) => {
      const response = jsonResponse(
        validSessionBody({ refreshToken: "recovered-refresh" }),
      );
      if (fetchMock.mock.calls.length === 1) {
        vi.spyOn(response, "json").mockImplementation(
          () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("body aborted"));
              });
            }),
        );
      }
      return Promise.resolve(response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const refresh = makeTransport().refreshSession();
    await vi.advanceTimersByTimeAsync(15_000);

    expect((await refresh).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.token).toBe("recovered-refresh");
  });

  it("新 refresh token が無い成功応答では旧 token を保持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(validSessionBody())),
    );

    expect(await makeTransport().refreshSession()).toEqual({
      kind: "transient",
      reason: "missing refresh token",
    });
    expect(
      JSON.parse(store.data.get(REFRESH_SESSION_KEY)!).pendingOperationId,
    ).toEqual(expect.any(String));
    expect(mockDeleteItem).not.toHaveBeenCalled();
    expect(store.token).toBe("old-refresh");
  });

  it("保存失敗は HTTP を追加せず同じ新 token の保存を再試行する", async () => {
    failCredentialWrites(store, "new-refresh", 1);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(validSessionBody({ refreshToken: "new-refresh" })),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const writes = mockSetItem.mock.calls.filter(
      ([key, value]) =>
        key === REFRESH_SESSION_KEY &&
        JSON.parse(value).refreshToken === "new-refresh",
    );
    expect(writes).toHaveLength(2);
    expect(writes[0][1]).toBe(writes[1][1]);
    expect(store.token).toBe("new-refresh");
  });

  it("保存が連続失敗した次回は新 rotation をせず受信済み session を保存する", async () => {
    failCredentialWrites(store, "unsaved-refresh");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(validSessionBody({ refreshToken: "unsaved-refresh" })),
      )
      .mockResolvedValueOnce(
        jsonResponse(validSessionBody({ refreshToken: "recovered-refresh" })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    expect((await transport.refreshSession()).kind).toBe("transient");
    expect(store.token).toBe("old-refresh");
    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.token).toBe("unsaved-refresh");
  });

  it("coordinator は保存完了まで次の refresh を同じ Promise で待たせる", async () => {
    const storage = deferred<void>();
    mockSetItem.mockImplementation(async (key, value) => {
      if (
        key === REFRESH_SESSION_KEY &&
        JSON.parse(value).refreshToken === "new-refresh"
      )
        await storage.promise;
      await store.write(key, value);
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(validSessionBody({ refreshToken: "new-refresh" })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const first = transport.refreshSession();
    await vi.waitFor(() =>
      expect(
        mockSetItem.mock.calls.some(
          ([key, value]) =>
            key === REFRESH_SESSION_KEY &&
            JSON.parse(value).refreshToken === "new-refresh",
        ),
      ).toBe(true),
    );
    const second = transport.refreshSession();
    expect(second).toBe(first);
    storage.resolve();

    expect((await first).kind).toBe("ok");
    expect((await second).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.token).toBe("new-refresh");
  });

  it("保存失敗後の logout は未保存の新 token を revoke してメモリも消す", async () => {
    failCredentialWrites(store, "unsaved-refresh");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(validSessionBody({ refreshToken: "unsaved-refresh" })),
      )
      .mockResolvedValueOnce(emptyResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const refresh = transport.refreshSession();
    const logout = transport.logout();
    expect((await refresh).kind).toBe("transient");
    expect(await logout).toEqual({ ok: true });
    expect(
      new Headers(fetchMock.mock.calls[1][1].headers).get("X-Refresh-Token"),
    ).toBe("unsaved-refresh");
    expect(store.token).toBeNull();
    expect(await transport.refreshSession()).toEqual({ kind: "expired" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("保存失敗後に並行 login が成功した場合は新 login token を使う", async () => {
    failCredentialWrites(store, "unsaved-refresh");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(validSessionBody({ refreshToken: "unsaved-refresh" })),
      )
      .mockResolvedValueOnce(
        jsonResponse(validSessionBody({ refreshToken: "login-refresh" })),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          validSessionBody({ refreshToken: "rotated-login-refresh" }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const refresh = transport.refreshSession();
    const login = transport.login("u", "pw");
    expect((await refresh).kind).toBe("transient");
    await login;
    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(
      new Headers(fetchMock.mock.calls[2][1].headers).get("Authorization"),
    ).toBe("Bearer login-refresh");
    expect(store.token).toBe("rotated-login-refresh");
    expect(mockSetItem).toHaveBeenLastCalledWith(
      REFRESH_TOKEN_KEY,
      "rotated-login-refresh",
    );
  });
});
