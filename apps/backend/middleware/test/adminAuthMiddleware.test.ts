import { Hono } from "hono";
import { sign } from "hono/jwt";

import type { AppContext } from "@backend/context";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { describe, expect, it, vi } from "vitest";

import { adminAuthMiddleware } from "../adminAuthMiddleware";

const JWT_SECRET_ADMIN = "x".repeat(32);
const JWT_AUDIENCE = "test-aud";

function createApp(logger?: {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
}) {
  const app = newHonoWithErrorHandling();
  app.use("*", async (c, next) => {
    if (logger) c.set("logger", logger as never);
    return next();
  });
  app.use("*", adminAuthMiddleware);
  app.get("/secured", (c) => c.json({ ok: true }));
  return app;
}

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
}

describe("adminAuthMiddleware", () => {
  const bindings = { JWT_SECRET_ADMIN, JWT_AUDIENCE, NODE_ENV: "test" };

  it("Authorization ヘッダなしは 401", async () => {
    const app = createApp();
    const res = await app.request("/secured", {}, bindings);
    expect(res.status).toBe(401);
  });

  it("不正な JWT は 401 かつ logger.warn が呼ばれる", async () => {
    const logger = makeLogger();
    const app = createApp(logger);
    const res = await app.request(
      "/secured",
      { headers: { Authorization: "Bearer invalid.jwt.token" } },
      bindings,
    );
    expect(res.status).toBe(401);
    expect(logger.warn).toHaveBeenCalledWith(
      "admin JWT verify failed",
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  it("正しい署名でも別 audience なら 401", async () => {
    const logger = makeLogger();
    const app = createApp(logger);
    const token = await sign(
      {
        email: "admin@example.com",
        role: "admin",
        aud: "wrong-aud",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET_ADMIN,
      "HS256",
    );
    const res = await app.request(
      "/secured",
      { headers: { Authorization: `Bearer ${token}` } },
      bindings,
    );
    expect(res.status).toBe(401);
    // 検証成功（payload 取得は通っている）なので warn は呼ばれない
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("role が admin でない場合は 403", async () => {
    const app = createApp();
    const token = await sign(
      {
        email: "user@example.com",
        role: "user",
        aud: JWT_AUDIENCE,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET_ADMIN,
      "HS256",
    );
    const res = await app.request(
      "/secured",
      { headers: { Authorization: `Bearer ${token}` } },
      bindings,
    );
    expect(res.status).toBe(403);
  });

  it("正常な admin トークンは通過し adminEmail が context に入る", async () => {
    const app = new Hono<AppContext>()
      .use("*", adminAuthMiddleware)
      .get("/secured", (c) => c.json({ email: c.get("adminEmail") }));
    const token = await sign(
      {
        email: "admin@example.com",
        role: "admin",
        aud: JWT_AUDIENCE,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET_ADMIN,
      "HS256",
    );
    const res = await app.request(
      "/secured",
      { headers: { Authorization: `Bearer ${token}` } },
      bindings,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { email: string };
    expect(body.email).toBe("admin@example.com");
  });
});
