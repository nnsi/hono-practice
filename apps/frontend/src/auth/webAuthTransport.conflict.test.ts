import { REFRESH_OPERATION_HEADER } from "@packages/types/authRefresh";
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
const operationHeader = (init: RequestInit) =>
  new Headers(init.headers).get(REFRESH_OPERATION_HEADER);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("新 session に残った Web refresh operation の回復", () => {
  it("login 後の clear 失敗から再生成すると 409 で proof を更新し 200 へ復帰する", async () => {
    const oldOperation = store().getOrCreate();
    const ids: Array<string | null> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/login")) {
        return jsonResponse(validSessionBody("new-login"));
      }
      const operation = operationHeader(init);
      ids.push(operation);
      expect(store().read() === operation).toBe(true);
      return operation === oldOperation
        ? emptyResponse(409)
        : jsonResponse(validSessionBody("recovered"));
    });
    vi.stubGlobal("fetch", fetchMock);
    const remove = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("storage clear unavailable");
      });
    await makeTransport().login("user", "password");
    expect(store().read() === oldOperation).toBe(true);
    remove.mockRestore();

    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(ids).toHaveLength(2);
    expect(ids[0] === oldOperation).toBe(true);
    expect(ids[1] === oldOperation).toBe(false);
    expect(store().read()).toBeNull();
  });

  it("409 による proof の置換は一度だけに制限する", async () => {
    const oldOperation = store().getOrCreate();
    const ids: Array<string | null> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        ids.push(operationHeader(init));
        return emptyResponse(409);
      }),
    );
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(ids).toHaveLength(2);
    expect(ids[0] === oldOperation).toBe(true);
    expect(ids[1] === oldOperation).toBe(false);
    expect(store().read() === ids[1]).toBe(true);
  });

  it.each([
    400, 401, 403, 408, 429, 500,
  ])("%i では proof を置き換えない", async (status) => {
    const oldOperation = store().getOrCreate();
    const ids: Array<string | null> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        ids.push(operationHeader(init));
        return emptyResponse(status);
      }),
    );
    await makeTransport().refreshSession();
    expect(ids).toHaveLength(status === 408 || status >= 500 ? 2 : 1);
    expect(ids.every((operation) => operation === oldOperation)).toBe(true);
    expect(store().read() === oldOperation).toBe(true);
  });

  it("login endpoint の 409 では既存 proof を変更しない", async () => {
    const oldOperation = store().getOrCreate();
    const fetchMock = vi.fn(async () => emptyResponse(409));
    vi.stubGlobal("fetch", fetchMock);
    await expect(makeTransport().login("user", "password")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store().read() === oldOperation).toBe(true);
  });

  it.each([
    "throw",
    "uncommitted",
  ])("409 後の上書きが %s なら旧 proof を残し再送しない", async (failure) => {
    const oldOperation = store().getOrCreate();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      if (failure === "throw") throw new Error("storage unavailable");
    });
    const remove = vi.spyOn(Storage.prototype, "removeItem");
    const fetchMock = vi.fn(async () => emptyResponse(409));
    vi.stubGlobal("fetch", fetchMock);
    const observe = vi.fn();
    const transport = createWebAuthTransport(
      { apiUrl, onDiagnostic: observe },
      createTokenHolder(),
    );
    expect(await transport.refreshSession()).toEqual({
      kind: "transient",
      reason: "storage",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(store().read() === oldOperation).toBe(true);
    expect(observe).toHaveBeenCalledWith({
      event: "storage_write",
      reason: "storage_write_failed",
      source: "storage",
      tokenSource: "local_storage",
    });
    expect(JSON.stringify(observe.mock.calls).includes(oldOperation)).toBe(
      false,
    );
  });

  it("409 の後に乱数生成が失敗しても旧 proof を削除しない", async () => {
    const oldOperation = store().getOrCreate();
    vi.stubGlobal("crypto", {});
    const fetchMock = vi.fn(async () => emptyResponse(409));
    vi.stubGlobal("fetch", fetchMock);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store().read() === oldOperation).toBe(true);
  });

  it("古い 409 は別の処理が保存した新しい pending を上書きしない", async () => {
    store().getOrCreate();
    let newerOperation = "";
    const fetchMock = vi.fn(async () => {
      store().clearIfEquals(store().read());
      newerOperation = store().getOrCreate();
      return emptyResponse(409);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store().read() === newerOperation).toBe(true);
  });

  it("409 後のネットワーク失敗と再起動では置換済み proof を維持する", async () => {
    const oldOperation = store().getOrCreate();
    const ids: Array<string | null> = [];
    let available = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const operation = operationHeader(init);
        ids.push(operation);
        if (operation === oldOperation) return emptyResponse(409);
        if (!available) throw new TypeError("response lost");
        return jsonResponse(validSessionBody());
      }),
    );
    expect((await makeTransport().refreshSession()).kind).toBe("transient");
    expect(ids).toHaveLength(3);
    expect(ids[1] === ids[2]).toBe(true);
    expect(store().read() === ids[1]).toBe(true);
    available = true;
    expect((await makeTransport().refreshSession()).kind).toBe("ok");
    expect(ids).toHaveLength(4);
    expect(ids[3] === ids[1]).toBe(true);
    expect(store().read()).toBeNull();
  });
});
