import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));

import {
  apiUrl,
  createTokenHolder,
  emptyResponse,
  jsonResponse,
  makeTransport,
  validSessionBody,
} from "./_webAuthTransportTestHelpers";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webAuthTransport.logout", () => {
  it("200 -> { ok: true }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(200)));
    const transport = makeTransport();

    expect(await transport.logout()).toEqual({ ok: true });
  });

  it("500 -> { ok: false } (cookie 残存の警告対象)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptyResponse(500)));
    const transport = makeTransport();

    expect(await transport.logout()).toEqual({ ok: false });
  });

  it("network error -> { ok: false }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    const transport = makeTransport();

    expect(await transport.logout()).toEqual({ ok: false });
  });

  it("401 後の refresh が expired なら server session 無効として { ok: true }", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401))
      .mockResolvedValueOnce(emptyResponse(401));
    vi.stubGlobal("fetch", fetchMock);

    expect(await makeTransport().logout()).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${apiUrl}/auth/logout`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${apiUrl}/auth/token`);
  });

  it("401 後の refresh が transient なら credential を保持して { ok: false }", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(emptyResponse(401))
        .mockResolvedValueOnce(emptyResponse(503)),
    );

    expect(await makeTransport().logout()).toEqual({ ok: false });
  });

  it("401 後の refresh 成功時は新しい Bearer で logout を再送する", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyResponse(401))
      .mockResolvedValueOnce(jsonResponse(validSessionBody("jwt-new")))
      .mockResolvedValueOnce(emptyResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    const tokenHolder = createTokenHolder();
    tokenHolder.setToken("jwt-old");
    const transport = makeTransport({ tokenHolder });

    expect(await transport.logout()).toEqual({ ok: true });

    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer jwt-new");
  });

  it("進行中 login の cookie 応答後に logout を実行して新 session を残さない", async () => {
    let resolveLogin!: (response: Response) => void;
    const loginResponse = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });
    let logoutCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/login")) return loginResponse;
      if (url.endsWith("/auth/token")) {
        return Promise.resolve(jsonResponse(validSessionBody("jwt-new")));
      }
      logoutCalls++;
      return Promise.resolve(emptyResponse(logoutCalls === 1 ? 401 : 200));
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = makeTransport();

    const login = transport.login("user", "pw");
    const logout = transport.logout();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveLogin(jsonResponse(validSessionBody("jwt-login")));
    await Promise.all([login, logout]);

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${apiUrl}/auth/login`,
      `${apiUrl}/auth/logout`,
      `${apiUrl}/auth/token`,
      `${apiUrl}/auth/logout`,
    ]);
  });
});
