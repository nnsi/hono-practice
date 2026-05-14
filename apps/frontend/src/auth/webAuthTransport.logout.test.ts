import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@packages/i18n", () => ({
  i18next: { t: (key: string) => key },
}));
vi.mock("@packages/sync-engine", () => ({
  trackServerTimeFromResponse: vi.fn(),
}));

import {
  apiUrl,
  emptyResponse,
  makeTransport,
} from "./_webAuthTransportTestHelpers";

beforeEach(() => {
  vi.clearAllMocks();
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

  it("authenticatedFetch 経由で /auth/logout を呼ぶ (Bearer 自動付与 + 401 retry を担う)", async () => {
    // logout は authenticatedFetch を直接使うので、global fetch ではなく
    // authenticatedFetch mock 自体に対する呼び出しを検証する
    const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(200));
    const transport = makeTransport({ authenticatedFetch: authFetchMock });

    const result = await transport.logout();

    expect(result).toEqual({ ok: true });
    expect(authFetchMock).toHaveBeenCalledWith(
      `${apiUrl}/auth/logout`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("authenticatedFetch が 401 を返すと { ok: false } (内部で refresh retry も尽きた場合)", async () => {
    const authFetchMock = vi.fn().mockResolvedValue(emptyResponse(401));
    const transport = makeTransport({ authenticatedFetch: authFetchMock });

    expect(await transport.logout()).toEqual({ ok: false });
  });
});
