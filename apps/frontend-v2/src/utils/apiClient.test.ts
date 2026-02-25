import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hono/client at top level (hc is called at module level)
vi.mock("hono/client", () => ({ hc: vi.fn(() => ({})) }));
vi.mock("@backend/app", () => ({}));

// We need to mock global fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { setToken, clearToken, customFetch, apiLogin } from "./apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearToken();
  });

  describe("setToken / clearToken", () => {
    it("customFetch uses token set by setToken", async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      setToken("my-token");
      await customFetch("http://localhost:3456/users/me", {});

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders.get("Authorization")).toBe("Bearer my-token");
    });

    it("customFetch does not set Authorization when token is cleared", async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      setToken("my-token");
      clearToken();
      await customFetch("http://localhost:3456/users/me", {});

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders.has("Authorization")).toBe(false);
    });
  });

  describe("customFetch", () => {
    it("sets Content-Type to application/json by default", async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      await customFetch("http://localhost:3456/users/me", {});

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders.get("Content-Type")).toBe("application/json");
    });

    it("does not override existing Content-Type", async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      await customFetch("http://localhost:3456/users/me", {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders.get("Content-Type")).toBe("multipart/form-data");
    });

    it('uses credentials "include" for /auth/ URLs', async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      await customFetch("http://localhost:3456/auth/token", {});

      expect(mockFetch.mock.calls[0][1].credentials).toBe("include");
    });

    it('uses credentials "omit" for non /auth/ URLs', async () => {
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      await customFetch("http://localhost:3456/users/me", {});

      expect(mockFetch.mock.calls[0][1].credentials).toBe("omit");
    });

    it("retries on 401 after successful token refresh", async () => {
      setToken("expired-token");

      // First call returns 401
      mockFetch.mockResolvedValueOnce(
        new Response("unauthorized", { status: 401 }),
      );
      // Token refresh call succeeds
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "new-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      // Retry call succeeds
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      const res = await customFetch("http://localhost:3456/users/me", {});

      expect(res.status).toBe(200);
      // 3 calls total: original, refresh, retry
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify retry used new token
      const retryHeaders = mockFetch.mock.calls[2][1].headers;
      expect(retryHeaders.get("Authorization")).toBe("Bearer new-token");
    });

    it("does not retry if token refresh fails", async () => {
      setToken("expired-token");

      // First call returns 401
      mockFetch.mockResolvedValueOnce(
        new Response("unauthorized", { status: 401 }),
      );
      // Token refresh fails
      mockFetch.mockResolvedValueOnce(
        new Response("error", { status: 500 }),
      );

      const res = await customFetch("http://localhost:3456/users/me", {});

      // Returns the original 401 response
      expect(res.status).toBe(401);
      // 2 calls: original + refresh attempt (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("sends Authorization header regardless of URL (customFetch is API-only)", async () => {
      // NOTE: customFetch はHono RPCクライアント専用で、API_URL以外のURLには使われない設計。
      // ただし、仮に外部URLが渡された場合でもAuthorizationヘッダーは付与される。
      // これは現在の仕様（API専用fetch）としてテストで文書化する。
      setToken("my-token");
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

      await customFetch("https://external-site.example.com/api", {});

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders.get("Authorization")).toBe("Bearer my-token");
    });

    it("concurrent 401s share a single token refresh (mutex)", async () => {
      setToken("expired-token");

      // Both calls return 401
      mockFetch.mockResolvedValueOnce(
        new Response("unauthorized", { status: 401 }),
      );
      mockFetch.mockResolvedValueOnce(
        new Response("unauthorized", { status: 401 }),
      );
      // Single token refresh
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "refreshed-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      // Retries for both requests
      mockFetch.mockResolvedValueOnce(new Response("ok1", { status: 200 }));
      mockFetch.mockResolvedValueOnce(new Response("ok2", { status: 200 }));

      const [res1, res2] = await Promise.all([
        customFetch("http://localhost:3456/users/me", {}),
        customFetch("http://localhost:3456/users/activities", {}),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Count refresh calls (calls to /auth/token)
      const refreshCalls = mockFetch.mock.calls.filter((call) =>
        String(call[0]).includes("/auth/token"),
      );
      // ミューテックスにより、リフレッシュは1回のみ
      expect(refreshCalls).toHaveLength(1);
    });
  });

  describe("apiLogin", () => {
    it("successful login sets token and returns data", async () => {
      const loginData = { token: "login-token", user: { id: "u1" } };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(loginData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await apiLogin("user1", "pass123");

      expect(result).toEqual(loginData);
      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3456/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ login_id: "user1", password: "pass123" }),
        },
      );

      // Verify token was set: make another customFetch call to check
      mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));
      await customFetch("http://localhost:3456/users/me", {});
      const headers = mockFetch.mock.calls[1][1].headers;
      expect(headers.get("Authorization")).toBe("Bearer login-token");
    });

    it("failed login throws error", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("bad", { status: 401 }),
      );

      await expect(apiLogin("user1", "wrong")).rejects.toThrow("Login failed");
    });
  });
});
