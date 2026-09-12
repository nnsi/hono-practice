import { app } from "@backend/app";
import { hashWithSHA256 } from "@backend/lib/hash";
import { appendLocalLog } from "@backend/middleware/localLogWriter";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { v7 } from "uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { newRefreshTokenRepository } from "../refreshTokenRepository";

vi.mock("@backend/middleware/localLogWriter", () => ({
  appendLocalLog: vi.fn(),
}));

const flowId = "10000000-0000-4000-8000-000000000001";
const executionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};
const env = () => ({
  NODE_ENV: "test",
  APP_URL: "https://actiko.app",
  DB: testDB,
  JWT_SECRET: "test-secret-at-least-thirty-two-characters",
  JWT_AUDIENCE: "test-audience",
});

describe("refresh diagnostics at the HTTP/logging boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("correlates a generic 401 with safe server-only reasons in direct WAE", async () => {
    const wae = { writeDataPoint: vi.fn() };
    const res = await app.request(
      "/auth/token",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer diagnostic-credential-canary",
          Cookie: "refresh_token=cookie-credential-canary",
          Origin: "https://actiko.app",
          "X-Auth-Diagnostic-Id": flowId,
          "X-Client-Platform": "ios",
        },
      },
      { ...env(), WAE_LOGS: wae },
      executionCtx,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "invalid refresh token" });
    expect(res.headers.get("X-Request-ID")).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    );
    expect(res.headers.get("Access-Control-Expose-Headers")).toBe(
      "X-Request-ID",
    );
    expect(wae.writeDataPoint).toHaveBeenCalledOnce();
    const point = wae.writeDataPoint.mock.calls[0][0];
    expect(point.blobs[2]).toBe(res.headers.get("X-Request-ID"));
    expect(JSON.parse(point.blobs[8])).toEqual({
      version: 1,
      env: "test",
      platform: "ios",
      tokenSource: "bearer",
      flowId,
      stage: "rotation",
      reason: "malformed",
      rotationCommitted: false,
    });
    expect(JSON.stringify(point)).not.toContain("credential-canary");
  });

  it("captures successful cookie rotation after commit and enrichment", async () => {
    const repo = newRefreshTokenRepository(testDB);
    const selector = v7();
    const plain = v7();
    await repo.createRefreshToken(
      createRefreshToken({
        userId: createUserId(TEST_USER_ID),
        selector,
        token: await hashWithSHA256(plain),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    );
    const wae = { writeDataPoint: vi.fn() };
    const res = await app.request(
      "/auth/token",
      {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${selector}.${plain}`,
          Origin: "https://actiko.app",
        },
      },
      { ...env(), WAE_LOGS: wae },
      executionCtx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect("refreshToken" in body).toBe(false);
    expect(res.headers.has("Set-Cookie")).toBe(true);
    const point = wae.writeDataPoint.mock.calls[0][0];
    expect(JSON.parse(point.blobs[8])).toMatchObject({
      reason: "rotated",
      stage: "response",
      rotationCommitted: true,
      tokenSource: "cookie",
      platform: "web",
    });
    expect(JSON.stringify(point)).not.toContain(selector);
    expect(JSON.stringify(point)).not.toContain(plain);
  });

  it("drops untrusted platform/flow headers and also records local response summaries", async () => {
    const res = await app.request(
      "/auth/token",
      {
        method: "POST",
        headers: {
          "X-Client-Platform": "secret-canary",
          "X-Auth-Diagnostic-Id": "secret-canary",
        },
      },
      env(),
    );
    expect(res.status).toBe(401);
    expect(appendLocalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: res.headers.get("X-Request-ID"),
        authDiagnostic: {
          version: 1,
          env: "test",
          platform: "unknown",
          tokenSource: "none",
          stage: "request",
          reason: "missing",
          rotationCommitted: false,
        },
      }),
    );
    expect(JSON.stringify(vi.mocked(appendLocalLog).mock.calls)).not.toContain(
      "secret-canary",
    );
  });

  it("permits diagnostic CORS headers and does not classify OPTIONS as a refresh", async () => {
    const wae = { writeDataPoint: vi.fn() };
    const res = await app.request(
      "/auth/token",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://actiko.app",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "x-auth-diagnostic-id,x-client-platform",
        },
      },
      { ...env(), WAE_LOGS: wae },
      executionCtx,
    );
    expect(res.status).toBe(204);
    const allowed = res.headers
      .get("Access-Control-Allow-Headers")
      ?.toLowerCase();
    expect(allowed).toContain("x-auth-diagnostic-id");
    expect(allowed).toContain("x-client-platform");
    expect(allowed).not.toContain("x-refresh-token");
    expect(wae.writeDataPoint.mock.calls[0][0].blobs[8]).toBeUndefined();
  });

  it("WAE write failure does not replace the auth result", async () => {
    const wae = {
      writeDataPoint: vi.fn(() => {
        throw new Error("unavailable");
      }),
    };
    const res = await app.request(
      "/auth/token",
      { method: "POST" },
      { ...env(), WAE_LOGS: wae },
      executionCtx,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "refresh token not found" });
    expect(wae.writeDataPoint).toHaveBeenCalledOnce();
  });

  it("console logging failure also preserves the response and independent WAE summary", async () => {
    const unavailable = () => {
      throw new Error("console sink unavailable");
    };
    const log = vi.spyOn(console, "log").mockImplementation(unavailable);
    const warn = vi.spyOn(console, "warn").mockImplementation(unavailable);
    try {
      const wae = { writeDataPoint: vi.fn() };
      const res = await app.request(
        "/auth/token",
        { method: "POST" },
        { ...env(), WAE_LOGS: wae },
        executionCtx,
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "refresh token not found" });
      expect(wae.writeDataPoint).toHaveBeenCalledOnce();
      expect(
        JSON.parse(wae.writeDataPoint.mock.calls[0][0].blobs[8]),
      ).toMatchObject({ reason: "missing" });
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });
});
