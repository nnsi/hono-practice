import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthenticatedFetch } from "./createAuthenticatedFetch";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

type TokenHolder = {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
};

function makeTokenHolder(initial: string | null = null): TokenHolder {
  let token = initial;
  return {
    getToken: () => token,
    setToken: (next) => {
      token = next;
    },
  };
}

describe("createAuthenticatedFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets Authorization header when token present", async () => {
    const holder = makeTokenHolder("my-token");
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await f("http://localhost:3456/users/me", {});
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("does not set Authorization when token is null", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await f("http://localhost:3456/users/me", {});
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("uses credentials include for /auth/ when enabled", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
      includeCredentialsForAuthEndpoints: true,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await f("http://localhost:3456/auth/token", {});
    expect(mockFetch.mock.calls[0][1].credentials).toBe("include");
  });

  it("uses credentials omit for non /auth/ when enabled", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
      includeCredentialsForAuthEndpoints: true,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await f("http://localhost:3456/users/me", {});
    expect(mockFetch.mock.calls[0][1].credentials).toBe("omit");
  });

  it("retries on 401 after successful refresh", async () => {
    const holder = makeTokenHolder("expired");
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => {
        holder.setToken("new-token");
        return "new-token";
      },
    });
    mockFetch.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await f("http://localhost:3456/users/me", {});
    expect(res.status).toBe(200);
    const retryHeaders = mockFetch.mock.calls[1][1].headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer new-token");
  });

  it("does not retry when refresh returns null", async () => {
    const holder = makeTokenHolder("expired");
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
    });
    mockFetch.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );

    const res = await f("http://localhost:3456/users/me", {});
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on 401 from /auth/token itself", async () => {
    const holder = makeTokenHolder("expired");
    const refreshSpy = vi.fn().mockResolvedValue("new-token");
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: refreshSpy,
    });
    mockFetch.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );

    await f("http://localhost:3456/auth/token", {});
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("sets default Content-Type to application/json", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    await f("http://localhost:3456/users/me", {});
    expect(mockFetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("does not override existing Content-Type", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
    });
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    await f("http://localhost:3456/upload", {
      headers: { "Content-Type": "multipart/form-data" },
    });
    expect(mockFetch.mock.calls[0][1].headers.get("Content-Type")).toBe(
      "multipart/form-data",
    );
  });

  it("does not treat /auth/token-debug as the refresh endpoint", async () => {
    const holder = makeTokenHolder("expired");
    const refreshSpy = vi.fn().mockResolvedValue("new-token");
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: refreshSpy,
    });
    mockFetch.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await f("http://localhost:3456/auth/token-debug", {});
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("aborts on timeout when requestTimeoutMs is set", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
      requestTimeoutMs: 10,
    });
    mockFetch.mockImplementationOnce((_input, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    });
    await expect(f("http://localhost:3456/users/me", {})).rejects.toThrow();
  });

  it("respects an externally supplied AbortSignal", async () => {
    const holder = makeTokenHolder(null);
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => null,
      requestTimeoutMs: 1000,
    });
    const external = new AbortController();
    mockFetch.mockImplementationOnce((_input, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    });
    const p = f("http://localhost:3456/users/me", { signal: external.signal });
    external.abort();
    await expect(p).rejects.toThrow();
  });

  it("concurrent 401s share a single refresh", async () => {
    const holder = makeTokenHolder("expired");
    let refreshCount = 0;
    const { fetch: f } = createAuthenticatedFetch({
      tokenSource: holder,
      refreshAccessToken: async () => {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 5));
        holder.setToken("refreshed");
        return "refreshed";
      },
    });
    mockFetch
      .mockResolvedValueOnce(new Response("u", { status: 401 }))
      .mockResolvedValueOnce(new Response("u", { status: 401 }))
      .mockResolvedValueOnce(new Response("ok1", { status: 200 }))
      .mockResolvedValueOnce(new Response("ok2", { status: 200 }));

    const [r1, r2] = await Promise.all([
      f("http://localhost:3456/users/me", {}),
      f("http://localhost:3456/users/activities", {}),
    ]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refreshCount).toBe(1);
  });
});
