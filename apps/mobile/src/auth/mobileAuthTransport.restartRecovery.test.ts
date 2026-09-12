import type { AuthTransport } from "@packages/auth-client";
import {
  REFRESH_OPERATION_HEADER,
  refreshOperationIdSchema,
} from "@packages/types/authRefresh";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  getStoredRefreshSession,
  setStoredRefreshSession,
} from "./refreshTokenStorage";

let store: ReturnType<typeof mockRefreshTokenStorage>;
const requestAssertions: (() => void)[] = [];
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-12T14:06:18.646Z"));
  store = mockRefreshTokenStorage("parent-refresh");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  // Assert outside fetch: the refresh helper intentionally catches network
  // errors, which could otherwise swallow failed expectations in the mock.
  for (const assertRequest of requestAssertions.splice(0)) assertRequest();
});

// The backend contract replays the same child for a parent+operation or its
// child+operation. Keeping this state while recreating transports models a kill.
function installReplayServer(
  dropResponses = 0,
  failure: "network" | "body" = "network",
) {
  const operations = new Map<string, { parent: string; child: string }>();
  const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
    const operationId = headers.get(REFRESH_OPERATION_HEADER) ?? "";
    const storedCredential = await getStoredRefreshSession();
    let operation = operations.get(operationId);
    if (!operation) {
      operation = { parent: token, child: `child-${operations.size + 1}` };
      operations.set(operationId, operation);
    }
    const allowedTokens = [operation.parent, operation.child];
    requestAssertions.push(() => {
      expect(refreshOperationIdSchema.safeParse(operationId).success).toBe(
        true,
      );
      // Every HTTP request must have an already durable matching operation.
      expect(storedCredential).toEqual({
        version: 2,
        refreshToken: token,
        pendingOperationId: operationId,
      });
      expect(allowedTokens).toContain(token);
    });
    const response = jsonResponse(
      validSessionBody({ refreshToken: operation.child }),
    );
    if (dropResponses > 0) {
      dropResponses--;
      if (failure === "network")
        throw new TypeError("response lost after commit");
      vi.spyOn(response, "json").mockRejectedValue(
        new TypeError("body interrupted"),
      );
    }
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return { operations, fetchMock };
}

describe("durable mobile refresh recovery", () => {
  it.each([
    "network",
    "body",
  ] as const)("replays one rotation after multiple process restarts and delayed %s failures", async (failure) => {
    const server = installReplayServer(4, failure);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    const firstOperation = (await getStoredRefreshSession()).pendingOperationId;
    vi.setSystemTime(Date.now() + 48_000);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect((await getStoredRefreshSession()).pendingOperationId).toBe(
      firstOperation,
    );
    vi.setSystemTime(Date.now() + 60_000);
    expect((await makeTransport().refreshSession()).kind).toBe("ok");

    expect(server.operations.size).toBe(1);
    expect(server.fetchMock).toHaveBeenCalledTimes(5);
    for (const [, init] of server.fetchMock.mock.calls)
      expect(new Headers(init?.headers).get(REFRESH_OPERATION_HEADER)).toBe(
        firstOperation,
      );
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "child-1",
      pendingOperationId: null,
    });
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("child-1");
  });

  it("does not send a refresh when the operation cannot be persisted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(SecureStore.setItemAsync).mockRejectedValue(
      new Error("store locked"),
    );
    expect(await makeTransport().refreshSession()).toEqual({
      kind: "transient",
      reason: "storage",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.data.has(REFRESH_SESSION_KEY)).toBe(false);
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("parent-refresh");
  });

  it("restarts with the parent proof when the received child's save never committed", async () => {
    const server = installReplayServer();
    failCredentialWrites(store, "child-1");
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    const operationId = (await getStoredRefreshSession()).pendingOperationId;
    expect(store.token).toBe("parent-refresh");
    vi.setSystemTime(Date.now() + 48_000);

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(server.operations.size).toBe(1);
    expect(server.fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(server.fetchMock.mock.calls[1][1]?.headers).get(
        REFRESH_OPERATION_HEADER,
      ),
    ).toBe(operationId);
    expect(store.token).toBe("child-1");
  });

  it("uses a fresh operation after the child and cleared pending proof committed atomically", async () => {
    const server = installReplayServer();
    vi.mocked(SecureStore.setItemAsync).mockImplementation(
      async (key, value) => {
        await store.write(key, value);
        if (
          key === REFRESH_SESSION_KEY &&
          JSON.parse(value).refreshToken === "child-1"
        )
          throw new Error("process stopped after durable commit");
      },
    );
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "child-1",
      pendingOperationId: null,
    });
    vi.mocked(SecureStore.setItemAsync).mockImplementation(store.write);
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(server.operations.size).toBe(2);
    const requests = server.fetchMock.mock.calls.map(
      ([, init]) => new Headers(init?.headers),
    );
    expect(requests[0].get(REFRESH_OPERATION_HEADER)).not.toBe(
      requests[1].get(REFRESH_OPERATION_HEADER),
    );
    expect(requests[1].get("Authorization")).toBe("Bearer child-1");
    expect(store.token).toBe("child-2");
  });

  it("clears a recovered child plus its previous pending proof without another rotation", async () => {
    const server = installReplayServer(2);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    const operationId = (await getStoredRefreshSession()).pendingOperationId;
    await setStoredRefreshSession({
      version: 2,
      refreshToken: "child-1",
      pendingOperationId: operationId,
    });
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(server.operations.size).toBe(1);
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "child-1",
      pendingOperationId: null,
    });
  });

  it("does not resurrect the legacy token after a failed deletion and a process restart", async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockRejectedValue(
      new Error("delete unavailable"),
    );
    await makeTransport().clearPersistedSession();
    expect(store.data.get(REFRESH_TOKEN_KEY)).toBe("parent-refresh");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await makeTransport().refreshSession()).toEqual({ kind: "expired" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await getStoredRefreshSession()).pendingOperationId).toBeNull();
  });

  const establish: [string, (transport: AuthTransport) => Promise<unknown>][] =
    [
      ["login", (transport) => transport.login("user", "password")],
      [
        "register",
        (transport) =>
          transport.register("user", "password", {
            age: true,
            terms: "2026-09-01",
            privacy: "2026-09-01",
          }),
      ],
      ["google", (transport) => transport.googleLogin("provider-credential")],
      ["apple", (transport) => transport.appleLogin("provider-credential")],
      [
        "persistSession",
        (transport) =>
          transport.persistSession(
            validSessionBody({ refreshToken: "new-session" }),
          ),
      ],
    ];
  it.each(
    establish,
  )("%s invalidates the previous session's recovery proof", async (_name, login) => {
    const oldOperation = "37f0a589-7be1-4a60-909d-e75bd65e0eca";
    await setStoredRefreshSession({
      version: 2,
      refreshToken: "parent-refresh",
      pendingOperationId: oldOperation,
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () =>
          jsonResponse(validSessionBody({ refreshToken: "new-session" })),
        ),
    );
    await login(makeTransport());
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: "new-session",
      pendingOperationId: null,
    });
    const server = installReplayServer();
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    const headers = new Headers(server.fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer new-session");
    expect(headers.get(REFRESH_OPERATION_HEADER)).not.toBe(oldOperation);
  });

  it("logout invalidates the pending operation and survives a restart", async () => {
    await setStoredRefreshSession({
      version: 2,
      refreshToken: "parent-refresh",
      pendingOperationId: "37f0a589-7be1-4a60-909d-e75bd65e0eca",
    });
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    expect(await makeTransport().logout()).toEqual({ ok: true });
    expect(await makeTransport().refreshSession()).toEqual({ kind: "expired" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(await getStoredRefreshSession()).toEqual({
      version: 2,
      refreshToken: null,
      pendingOperationId: null,
    });
  });
});
