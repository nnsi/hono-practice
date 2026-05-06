import { sign } from "hono/jwt";

import type { KeyValueStore } from "@backend/infra/kv/kv";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { describe, expect, it, vi } from "vitest";

import { app } from "../../../app";
import { clientErrorRoute } from "../clientErrorRoute";

const TEST_JWT_SECRET = "test-jwt-secret-must-be-at-least-32-characters";
const TEST_JWT_AUDIENCE = "test-aud";
const TEST_USER_ID = "00000000-0000-4000-8000-000000000099";

type RateRecord = { count: number; windowStart: number };
function makeStore(): KeyValueStore<RateRecord> & {
  data: Map<string, RateRecord>;
} {
  const data = new Map<string, RateRecord>();
  return {
    data,
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => {
      data.set(k, v);
    }),
    delete: vi.fn(async (k) => {
      data.delete(k);
    }),
  };
}

function createIsolatedApp() {
  return newHonoWithErrorHandling().route("/client-errors", clientErrorRoute);
}

describe("POST /client-errors", () => {
  it("returns 204 for valid error report", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "TypeError: Cannot read properties of undefined",
          stack: "at Component.render (app.tsx:42)",
          platform: "ios",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });

  it("returns 204 with all optional fields", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "component_error",
          message: "Render error",
          stack: "stack trace here",
          userId: "user-123",
          screen: "(tabs)/goals",
          platform: "android",
          appVersion: "1.0.0",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid errorType", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "invalid_type",
          message: "some error",
          platform: "ios",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is missing", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 1000 characters", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "x".repeat(1001),
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid platform", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "error",
          platform: "windows",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("accepts request without optional fields", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "network_error",
          message: "Network request failed",
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });

  describe("auth + rate limit + server-side userId", () => {
    const validBody = {
      errorType: "component_error" as const,
      message: "boom",
      platform: "web" as const,
    };

    it("認証なしでも 204 を返し、WAE には userId 空文字で書き込む", async () => {
      const isolated = createIsolatedApp();
      const wae = { writeDataPoint: vi.fn() };
      const res = await isolated.request(
        "/client-errors",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validBody),
        },
        {
          NODE_ENV: "test",
          JWT_SECRET: TEST_JWT_SECRET,
          JWT_AUDIENCE: TEST_JWT_AUDIENCE,
          WAE_CLIENT_ERRORS: wae,
          RATE_LIMIT_KV: makeStore(),
        },
      );
      expect(res.status).toBe(204);
      expect(wae.writeDataPoint).toHaveBeenCalledOnce();
      const call = wae.writeDataPoint.mock.calls[0][0];
      expect(call.blobs[3]).toBe("");
    });

    it("認証あり: userId はトークン由来になりリクエストの userId は無視される", async () => {
      const isolated = createIsolatedApp();
      const wae = { writeDataPoint: vi.fn() };
      const token = await sign(
        {
          userId: TEST_USER_ID,
          aud: TEST_JWT_AUDIENCE,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        TEST_JWT_SECRET,
        "HS256",
      );

      const res = await isolated.request(
        "/client-errors",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // クライアント送信 userId はスキーマで未定義のため無視
          body: JSON.stringify({ ...validBody, userId: "attacker-id" }),
        },
        {
          NODE_ENV: "test",
          JWT_SECRET: TEST_JWT_SECRET,
          JWT_AUDIENCE: TEST_JWT_AUDIENCE,
          WAE_CLIENT_ERRORS: wae,
          RATE_LIMIT_KV: makeStore(),
        },
      );
      expect(res.status).toBe(204);
      expect(wae.writeDataPoint).toHaveBeenCalledOnce();
      const call = wae.writeDataPoint.mock.calls[0][0];
      expect(call.blobs[3]).toBe(TEST_USER_ID);
    });

    it("レート制限超過時に 429 を返す（30/分）", async () => {
      const isolated = createIsolatedApp();
      const wae = { writeDataPoint: vi.fn() };
      const bindings = {
        NODE_ENV: "test",
        JWT_SECRET: TEST_JWT_SECRET,
        JWT_AUDIENCE: TEST_JWT_AUDIENCE,
        WAE_CLIENT_ERRORS: wae,
        RATE_LIMIT_KV: makeStore(),
      };
      let last: Response | null = null;
      for (let i = 0; i < 31; i++) {
        last = await isolated.request(
          "/client-errors",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "cf-connecting-ip": "203.0.113.42",
            },
            body: JSON.stringify(validBody),
          },
          bindings,
        );
      }
      expect(last?.status).toBe(429);
      // 30件は通って WAE に書き込まれ、31件目は rate limit で書き込まれない
      expect(wae.writeDataPoint).toHaveBeenCalledTimes(30);
    });
  });
});
