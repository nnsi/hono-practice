import { sign } from "hono/jwt";

import { describe, expect, it } from "vitest";

import { app } from "../app";
import { TEST_USER_ID, testDB } from "../test.setup";

describe("POST /batch", () => {
  const JWT_SECRET = "test-jwt-secret";
  const JWT_AUDIENCE = "test-audience";

  const createJwtToken = async (userId: string) => {
    return await sign(
      {
        userId,
        aud: JWT_AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      JWT_SECRET,
    );
  };

  const makeRequest = async (paths: { path: string }[], token?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return app.request(
      "/batch",
      {
        method: "POST",
        headers,
        body: JSON.stringify(paths),
      },
      {
        DB: testDB,
        JWT_SECRET,
        JWT_AUDIENCE,
        NODE_ENV: "test",
        APP_URL: "http://localhost:5173",
      },
    );
  };

  describe("正常系", () => {
    it("正規のバッチリクエストが動作する", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest(
        [{ path: "/users/tasks" }, { path: "/users/activities" }],
        token,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    it("サブリクエストのトレーサーサマリーが親に集約される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      // サブリクエスト単体で X-Tracer-Summary ヘッダーが付与されることを確認
      const subRes = await app.request(
        "/users/tasks",
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
        {
          DB: testDB,
          JWT_SECRET,
          JWT_AUDIENCE,
          NODE_ENV: "test",
          APP_URL: "http://localhost:5173",
          __authenticatedUserId: TEST_USER_ID,
        },
      );
      expect(subRes.status).toBe(200);
      const summaryHeader = subRes.headers.get("X-Tracer-Summary");
      expect(summaryHeader).not.toBeNull();
      const summary = JSON.parse(summaryHeader!);
      // DB操作があるためdbMsが0以上
      expect(summary).toHaveProperty("dbMs");
      expect(summary).toHaveProperty("spanCount");
      expect(summary.spanCount).toBeGreaterThan(0);
    });

    it("クエリストリング付きのパスも動作する", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest([{ path: "/users/tasks?limit=10" }], token);

      expect(res.status).toBe(200);
    });
  });

  describe("パストラバーサル対策", () => {
    it("..を含むパスが拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest(
        [{ path: "/users/../admin/secrets" }],
        token,
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });

    it("../を使った親ディレクトリ参照が拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest(
        [{ path: "/users/tasks/../../../etc/passwd" }],
        token,
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });

    it("URLエンコードされた%2e%2eが拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest([{ path: "/users/%2e%2e/admin" }], token);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });

    it("大文字URLエンコードされた%2E%2Eが拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest([{ path: "/users/%2E%2E/admin" }], token);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });

    it("混合大小文字の%2E%2eも拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest([{ path: "/users/%2E%2e/admin" }], token);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });

    it("クエリストリングに..が含まれる場合は許可される（パス部分のみチェック）", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest(
        [{ path: "/users/tasks?filter=.." }],
        token,
      );

      // クエリストリングの..はパストラバーサルではないので許可される
      expect(res.status).toBe(200);
    });
  });

  describe("パス検証", () => {
    it("/users/で始まらないパスが拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest([{ path: "/admin/users" }], token);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid batch request path",
      });
    });

    it("複数のリクエスト中に不正なパスがあると全体が拒否される", async () => {
      const token = await createJwtToken(TEST_USER_ID);

      const res = await makeRequest(
        [
          { path: "/users/tasks" },
          { path: "/users/../admin" },
          { path: "/users/activities" },
        ],
        token,
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        message: "Invalid path: path traversal detected",
      });
    });
  });

  describe("認証", () => {
    it("認証なしでリクエストすると401が返される", async () => {
      const res = await makeRequest([{ path: "/users/tasks" }]);

      expect(res.status).toBe(401);
    });
  });
});
