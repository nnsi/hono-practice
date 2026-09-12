import {
  type AuthDiagnosticEntry,
  authDiagnosticEntrySchema,
} from "@packages/types/authDiagnostics";
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
  apiUrl,
  createTokenHolder,
  emptyResponse,
  failCredentialWrites,
  jsonResponse,
  mockRefreshTokenStorage,
  validSessionBody,
} from "./_mobileAuthTransportTestHelpers";
import { createMobileAuthTransport } from "./mobileAuthTransport";

const getItem = vi.mocked(SecureStore.getItemAsync);
const setItem = vi.mocked(SecureStore.setItemAsync);
const deleteItem = vi.mocked(SecureStore.deleteItemAsync);
const secret = "private-credential-never-log";
let entries: AuthDiagnosticEntry[];
let store: ReturnType<typeof mockRefreshTokenStorage>;

function makeTransport() {
  return createMobileAuthTransport(
    { apiUrl, onDiagnostic: (entry) => entries.push(entry) },
    createTokenHolder(),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  entries = [];
  store = mockRefreshTokenStorage(secret);
});

afterEach(() => {
  for (const entry of entries) {
    expect(authDiagnosticEntrySchema.safeParse(entry).success).toBe(true);
  }
  expect(JSON.stringify(entries)).not.toContain(secret);
  for (const [key, value] of setItem.mock.calls) {
    if (key !== REFRESH_SESSION_KEY) continue;
    const operationId = JSON.parse(value).pendingOperationId;
    if (operationId) expect(JSON.stringify(entries)).not.toContain(operationId);
  }
  vi.unstubAllGlobals();
});

describe("mobile auth diagnostics", () => {
  it("refresh token 不在と読み出した保存先を記録し、従来どおり expired を返す", async () => {
    getItem.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await makeTransport().refreshSession()).toEqual({ kind: "expired" });
    expect(entries).toEqual([
      {
        event: "storage_read",
        reason: "missing_refresh_token",
        source: "storage",
        tokenSource: "secure_store",
      },
      {
        event: "refresh_result",
        reason: "missing_refresh_token",
        source: "refresh",
        tokenSource: "none",
      },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("SecureStore 読み出し失敗は token 不在と区別して transient を維持する", async () => {
    getItem.mockRejectedValue(new Error(secret));

    expect(await makeTransport().refreshSession()).toEqual({
      kind: "transient",
      reason: "storage",
    });
    expect(entries).toEqual([
      {
        event: "storage_read",
        reason: "storage_read_failed",
        source: "storage",
        tokenSource: "secure_store",
      },
    ]);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("保存一度失敗と同じ token の再保存成功を記録する", async () => {
    failCredentialWrites(store, secret, 1);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            validSessionBody({ token: secret, refreshToken: secret }),
          ),
        ),
    );

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(entries.filter((entry) => entry.event === "storage_write")).toEqual([
      {
        event: "storage_write",
        reason: "ok",
        source: "storage",
        tokenSource: "secure_store",
        attempt: 1,
      },
      {
        event: "storage_write",
        reason: "storage_write_retry",
        source: "storage",
        tokenSource: "secure_store",
        attempt: 1,
      },
      {
        event: "storage_write",
        reason: "ok",
        source: "storage",
        tokenSource: "secure_store",
        attempt: 2,
      },
    ]);
  });

  it("連続保存失敗後はメモリ token の読み出しを記録し、回復動作を維持する", async () => {
    failCredentialWrites(store, secret);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () =>
          jsonResponse(validSessionBody({ refreshToken: secret })),
        ),
    );
    const transport = makeTransport();

    expect((await transport.refreshSession()).kind).toBe("transient");
    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(entries).toContainEqual({
      event: "storage_write",
      reason: "storage_write_failed",
      source: "storage",
      tokenSource: "secure_store",
      attempt: 2,
    });
    expect(entries).toContainEqual({
      event: "storage_read",
      reason: "ok",
      source: "storage",
      tokenSource: "memory",
    });
    expect(getItem).toHaveBeenCalledTimes(2);
  });

  it("clear 失敗を記録し、呼び出し元へ元の例外をそのまま返す", async () => {
    const error = new Error(secret);
    setItem.mockRejectedValue(error);

    await expect(makeTransport().clearPersistedSession()).rejects.toBe(error);
    expect(entries).toEqual([
      {
        event: "storage_clear",
        reason: "storage_clear_failed",
        source: "storage",
        tokenSource: "secure_store",
      },
    ]);
  });

  it("HTTP 401 と storage clear の両方を記録する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(401)));

    expect((await makeTransport().refreshSession()).kind).toBe("expired");
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: "refresh_result",
        reason: "http_401",
        status: 401,
      }),
    );
    expect(entries).toContainEqual({
      event: "storage_clear",
      reason: "ok",
      source: "storage",
      tokenSource: "secure_store",
    });
  });

  it("新 token の無い成功応答を記録し、既存の transient 結果を維持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(validSessionBody())),
    );

    expect(await makeTransport().refreshSession()).toEqual({
      kind: "transient",
      reason: "missing refresh token",
    });
    expect(entries).toContainEqual({
      event: "refresh_result",
      reason: "missing_rotated_token",
      source: "refresh",
    });
    expect(store.token).toBe(secret);
    expect(
      JSON.parse(store.data.get(REFRESH_SESSION_KEY)!).pendingOperationId,
    ).toEqual(expect.any(String));
  });

  it("observer が投げても refresh 結果と保存は変わらない", async () => {
    const transport = createMobileAuthTransport(
      {
        apiUrl,
        onDiagnostic: () => {
          throw new Error("observer failed");
        },
      },
      createTokenHolder(),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(validSessionBody({ refreshToken: secret })),
        ),
    );

    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(store.token).toBe(secret);
    expect(
      JSON.parse(store.data.get(REFRESH_SESSION_KEY)!).pendingOperationId,
    ).toBeNull();
  });

  it("refresh に診断 ID と platform を付与し、認証 header は変更しない", async () => {
    const flowId = "f8e28e2b-f9e6-4b0b-9c37-503a3f2b0028";
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(429));
    vi.stubGlobal("fetch", fetchMock);
    const transport = createMobileAuthTransport(
      {
        apiUrl,
        diagnosticHeaders: {
          "X-Auth-Diagnostic-Id": flowId,
          "X-Client-Platform": "ios",
          Authorization: "must not replace credential",
        },
      },
      createTokenHolder(),
    );

    expect((await transport.refreshSession()).kind).toBe("transient");
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("X-Auth-Diagnostic-Id")).toBe(flowId);
    expect(headers.get("X-Client-Platform")).toBe("ios");
    expect(headers.get("Authorization")).toBe(`Bearer ${secret}`);
    expect(headers.get("X-Refresh-Operation")).not.toBe(flowId);
    expect(headers.get("X-Refresh-Operation")).toBe(
      JSON.parse(store.data.get(REFRESH_SESSION_KEY)!).pendingOperationId,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
