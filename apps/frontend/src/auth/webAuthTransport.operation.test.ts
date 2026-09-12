import {
  REFRESH_OPERATION_HEADER,
  refreshOperationIdSchema,
} from "@packages/types/authRefresh";
import { authResponseSchema } from "@packages/types/response";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiUrl,
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  validSessionBody,
} from "./_webAuthTransportTestHelpers";
import { createWebAuthTransport } from "./webAuthTransport";
import { newWebRefreshOperationStore } from "./webRefreshOperationStore";

const store = () => newWebRefreshOperationStore(apiUrl);
const headerId = (init: RequestInit) =>
  new Headers(init.headers).get(REFRESH_OPERATION_HEADER);

function installLocks() {
  let tail: Promise<unknown> = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request(_name: string, callback: () => Promise<unknown>) {
        const result = tail.then(callback, callback);
        tail = result.catch(() => {});
        return result;
      },
    },
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Web refresh operation の永続化", () => {
  it("送信前に secret UUID を保存し、本文の検証が成功した後に削除する", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const operationId = headerId(init);
      expect(refreshOperationIdSchema.safeParse(operationId).success).toBe(
        true,
      );
      expect(store().read() === operationId).toBe(true);
      expect(init.keepalive).toBeUndefined();
      return jsonResponse(validSessionBody());
    });
    vi.stubGlobal("fetch", fetchMock);

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store().read()).toBeNull();
  });

  it("通信失敗時の即時再試行と新しい transport が同じ proof を再利用する", async () => {
    const ids: Array<string | null> = [];
    let available = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        ids.push(headerId(init));
        if (!available) throw new TypeError("offline");
        return jsonResponse(validSessionBody());
      }),
    );
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(ids).toHaveLength(2);
    expect(store().read() === ids[0]).toBe(true);

    available = true;
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(1);
    expect(store().read()).toBeNull();
  });

  it("回復 proof は公開診断 ID と分離し診断イベントへ含めない", async () => {
    const flowId = crypto.randomUUID();
    const observe = vi.fn();
    let operationId: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        operationId = headerId(init);
        expect(operationId === flowId).toBe(false);
        expect(
          new Headers(init.headers).get("X-Auth-Diagnostic-Id") === flowId,
        ).toBe(true);
        return jsonResponse(validSessionBody());
      }),
    );
    const transport = createWebAuthTransport(
      {
        apiUrl,
        onDiagnostic: observe,
        diagnosticHeaders: { "X-Auth-Diagnostic-Id": flowId },
      },
      createTokenHolder(),
    );
    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(observe).toHaveBeenCalled();
    expect(JSON.stringify(observe.mock.calls).includes(operationId!)).toBe(
      false,
    );
  });

  it("Cookie を受領しても不完全な JSON body では proof を残す", async () => {
    const ids: Array<string | null> = [];
    let complete = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        ids.push(headerId(init));
        return complete
          ? jsonResponse(validSessionBody())
          : new Response('{"token":');
      }),
    );
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(store().read() === ids[0]).toBe(true);
    complete = true;
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(new Set(ids).size).toBe(1);
    expect(store().read()).toBeNull();
  });

  it.each([
    "getItem",
    "setItem",
  ] as const)("localStorage.%s が失敗すると rotation を送信しない", async (method) => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const observe = vi.fn();
    const transport = createWebAuthTransport(
      { apiUrl, onDiagnostic: observe },
      createTokenHolder(),
    );
    expect(await transport.refreshSession()).toEqual({
      kind: "transient",
      reason: "network",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const operation = method === "getItem" ? "read" : "write";
    expect(observe).toHaveBeenCalledWith({
      event: `storage_${operation}`,
      reason: `storage_${operation}_failed`,
      source: "storage",
      tokenSource: "local_storage",
    });
  });

  it("書き込みが反映されなければ rotation を送信しない", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CSPRNG が使えなければ別の乱数生成へ切り替えず rotation を送信しない", async () => {
    vi.stubGlobal("crypto", {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store().read()).toBeNull();
  });

  it("ACK の削除が失敗しても受領した session と回復 proof を維持する", async () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(validSessionBody())),
    );
    const observe = vi.fn();
    const transport = createWebAuthTransport(
      { apiUrl, onDiagnostic: observe },
      createTokenHolder(),
    );
    expect((await transport.refreshSession()).kind).toBe("ok");
    expect(refreshOperationIdSchema.safeParse(store().read()).success).toBe(
      true,
    );
    expect(observe).toHaveBeenCalledWith({
      event: "storage_clear",
      reason: "storage_clear_failed",
      source: "storage",
      tokenSource: "local_storage",
    });
    expect(JSON.stringify(observe.mock.calls).includes(store().read()!)).toBe(
      false,
    );
  });

  it("保存失敗の observer が throw しても送信せず transient を返す", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const transport = createWebAuthTransport(
      {
        apiUrl,
        onDiagnostic() {
          throw new Error("observer unavailable");
        },
      },
      createTokenHolder(),
    );
    expect((await transport.refreshSession()).kind).toBe("transient");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("古い応答の ACK は後から保存された別の pending を消さない", async () => {
    let newerId = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        store().clearIfEquals(store().read());
        newerId = store().getOrCreate();
        return jsonResponse(validSessionBody());
      }),
    );
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(store().read() === newerId).toBe(true);
  });
});

describe("session の変更時の Web refresh operation cleanup", () => {
  it.each([
    "login",
    "register",
    "googleLogin",
    "appleLogin",
  ] as const)("%s の成功で以前の proof を消す", async (method) => {
    store().getOrCreate();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(validSessionBody())),
    );
    const transport = makeTransport();
    if (method === "login") {
      await transport.login("user", "password");
    } else if (method === "register") {
      await transport.register("user", "password", {
        age: true,
        terms: "2026-09-12",
        privacy: "2026-09-12",
      });
    } else {
      await transport[method]("credential");
    }
    expect(store().read()).toBeNull();
  });

  it("login が拒否された場合は既存 session の回復 proof を残す", async () => {
    const existing = store().getOrCreate();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => emptyResponse(401)),
    );
    await expect(makeTransport().login("user", "password")).rejects.toThrow();
    expect(store().read() === existing).toBe(true);
  });

  it("login の成功 Cookie 後に JSON を失っても以前の session の proof は消す", async () => {
    store().getOrCreate();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{")),
    );
    await expect(makeTransport().login("user", "password")).rejects.toThrow();
    expect(store().read()).toBeNull();
  });

  it("logout 中の expired refresh が作った proof も logout 成功時に消す", async () => {
    installLocks();
    const fetchMock = vi.fn(async () => emptyResponse(401));
    vi.stubGlobal("fetch", fetchMock);
    expect(await makeTransport().logout()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store().read()).toBeNull();
  });

  it("logout の一時失敗は未受領 refresh の proof を残す", async () => {
    const existing = store().getOrCreate();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => emptyResponse(503)),
    );
    expect(await makeTransport().logout()).toEqual({ ok: false });
    expect(store().read() === existing).toBe(true);
  });

  it("別タブの refresh 応答より後に login を送り Cookie と proof を揃える", async () => {
    installLocks();
    let finishRefresh!: (response: Response) => void;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/token")) {
        return new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        });
      }
      return Promise.resolve(jsonResponse(validSessionBody()));
    });
    vi.stubGlobal("fetch", fetchMock);
    const refresh = makeTransport().refreshSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const login = makeTransport().login("user", "password");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finishRefresh(jsonResponse(validSessionBody()));
    await Promise.all([refresh, login]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store().read()).toBeNull();
  });

  it("待機していた forceLogout/account 削除は新 session の pending を消さない", async () => {
    store().getOrCreate();
    let enterLock!: () => Promise<void>;
    vi.stubGlobal("navigator", {
      locks: {
        request(_name: string, callback: () => Promise<void>) {
          return new Promise<void>((resolve) => {
            enterLock = async () => {
              await callback();
              resolve();
            };
          });
        },
      },
    });
    const clearing = makeTransport().clearPersistedSession();
    await vi.waitFor(() => expect(enterLock).toBeDefined());
    store().clearIfEquals(store().read());
    const newer = store().getOrCreate();
    await enterLock();
    await clearing;
    expect(store().read() === newer).toBe(true);
  });

  it.each([
    "persistSession",
    "clearPersistedSession",
  ] as const)("%s は現在の pending を消す", async (method) => {
    store().getOrCreate();
    const transport = makeTransport();
    if (method === "persistSession") {
      await transport.persistSession(
        authResponseSchema.parse(validSessionBody()),
      );
    } else {
      await transport.clearPersistedSession();
    }
    expect(store().read()).toBeNull();
  });
});
