import { app } from "@backend/app";
import { testDB } from "@backend/test.setup";
import { REFRESH_OPERATION_HEADER } from "@packages/types/authRefresh";
import { afterEach, describe, expect, it, vi } from "vitest";

import { newAuthHandler } from "../authHandler";
import { recoveryFixture } from "./authRefreshRecovery.setup";

vi.mock("@backend/middleware/localLogWriter", () => ({
  appendLocalLog: vi.fn(),
}));

const request = (token: string, operation: string) =>
  app.request(
    "/auth/token",
    {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${token}`,
        Origin: "https://actiko.app",
        [REFRESH_OPERATION_HEADER]: operation,
      },
    },
    {
      NODE_ENV: "test",
      APP_URL: "https://actiko.app",
      DB: testDB,
      JWT_SECRET: "test-secret",
      JWT_AUDIENCE: "test-audience",
    },
  );

describe("refresh recovery cookie boundary", () => {
  afterEach(() => vi.useRealTimers());

  it("returns an explicit non-consuming 409 for a current cookie outside the recorded operation", async () => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    const nextOperation = crypto.randomUUID();
    const current = await f.rotate(first.refreshToken, nextOperation);
    const rows = await f.rows();
    const conflict = await request(current.refreshToken, f.operation);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      message: "refresh operation conflict",
    });
    expect(conflict.headers.has("Set-Cookie")).toBe(false);
    expect(JSON.stringify(await f.rows()) === JSON.stringify(rows)).toBe(true);
    const retry = await request(current.refreshToken, crypto.randomUUID());
    expect(retry.status).toBe(200);
    expect(await f.rows()).toHaveLength(4);
    // A consumed parent still needs its matching proof, even when the wrong
    // nonce is another known operation rather than a completely new value.
    expect((await request(f.combined, nextOperation)).status).toBe(401);
    expect((await request(f.combined, crypto.randomUUID())).status).toBe(401);
  });

  it("recovers the committed child after response enrichment fails", async () => {
    const f = await recoveryFixture();
    const unavailable = async (): Promise<never> => {
      throw new Error("enrichment unavailable");
    };
    const handler = newAuthHandler(
      {
        login: unavailable,
        rotateRefreshToken: f.rotate,
        logout: f.logout,
        loginWithProvider: unavailable,
        linkProvider: unavailable,
      },
      unavailable,
      unavailable,
      f.collector.observe,
    );
    await expect(
      handler.rotateRefreshToken(f.combined, f.operation),
    ).rejects.toMatchObject({
      status: 503,
      message: "refresh temporarily unavailable",
    });
    expect(f.collector.snapshot()).toMatchObject({
      rotationCommitted: true,
      reason: "enrichment_failed",
    });
    const before = await f.rows();
    expect(before).toHaveLength(2);
    const result = await f.rotate(f.combined, f.operation);
    expect(
      before.some(
        (row) =>
          row.id !== f.parent.id &&
          row.selector === result.refreshToken.split(".")[0],
      ),
    ).toBe(true);
    expect(await f.rows()).toHaveLength(2);
  });

  it("returns the committed child cookie and its original expiry after a lost response", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    const f = await recoveryFixture();
    const first = await request(f.combined, f.operation);
    expect(first.status).toBe(200);
    const cookie = first.headers.get("Set-Cookie");
    expect(cookie).toContain("Expires=");
    vi.setSystemTime(now + 60 * 60 * 1000);
    const retry = await request(f.combined, f.operation);
    expect(retry.status).toBe(200);
    expect(retry.headers.get("Set-Cookie") === cookie).toBe(true);
    const body = await retry.json();
    expect("refreshToken" in body).toBe(false);
    expect("refreshTokenExpiresAt" in body).toBe(false);
    expect(JSON.stringify(body).includes(f.operation)).toBe(false);
    expect(await f.rows()).toHaveLength(2);
  });

  it("ACKs an already received child cookie after parent expiry without extending cookie lifetime", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    const f = await recoveryFixture(new Date(now + 1000));
    const first = await request(f.combined, f.operation);
    expect(first.status).toBe(200);
    const cookie = first.headers.get("Set-Cookie")!;
    const child = cookie.split(";")[0].slice("refresh_token=".length);
    vi.setSystemTime(now + 48_000);
    await f.repo.deleteRefreshTokensPastExpiry();
    expect((await request(f.combined, f.operation)).status).toBe(401);
    const ack = await request(child, f.operation);
    expect(ack.status).toBe(200);
    expect(ack.headers.get("Set-Cookie") === cookie).toBe(true);
    expect(await f.rows()).toHaveLength(2);
  });
});
