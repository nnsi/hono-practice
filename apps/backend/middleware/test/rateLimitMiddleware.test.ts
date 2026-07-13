import { Hono } from "hono";

import {
  type RateLimitStore,
  newMemoryRateLimitStore,
} from "@backend/infra/rateLimit";
import { describe, expect, it, vi } from "vitest";

import {
  contactRateLimitConfig,
  loginRateLimitConfig,
  registerRateLimitConfig,
  tokenRateLimitConfig,
  webhookRateLimitConfig,
} from "../rateLimitConfigs";
import {
  applyRateLimit,
  createRateLimitMiddleware,
} from "../rateLimitMiddleware";

const createMockStore = newMemoryRateLimitStore;

describe("rateLimitMiddleware", () => {
  const createTestApp = (store: RateLimitStore) => {
    const app = new Hono();

    const rateLimitMiddleware = createRateLimitMiddleware(store, {
      windowMs: 60 * 1000, // 1分
      limit: 3, // 3回まで
      keyGenerator: ({ ip }) => `test:${ip}`,
    });

    app.use("*", rateLimitMiddleware);
    app.get("/", (c) => c.json({ message: "ok" }));

    return app;
  };

  it("制限内のリクエストが成功する", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("2");
  });

  it("連続リクエストでカウントが増える", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    // 1回目
    const res1 = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("2");

    // 2回目
    const res2 = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("1");

    // 3回目
    const res3 = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });
    expect(res3.status).toBe(200);
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("制限超過時に429が返される", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    // 3回リクエスト
    for (let i = 0; i < 3; i++) {
      await app.request("/", {
        headers: { "x-forwarded-for": "192.168.1.3" },
      });
    }

    // 4回目は429
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.3" },
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({ message: "too many requests" });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("異なるIPは別々にカウントされる", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    // IP1で3回
    for (let i = 0; i < 3; i++) {
      await app.request("/", {
        headers: { "x-forwarded-for": "192.168.1.10" },
      });
    }

    // IP2は新規なので成功
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.11" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("2");
  });

  it("ウィンドウがリセットされると再度リクエスト可能", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    // 古いウィンドウのデータを直接設定
    const oldWindowStart = Date.now() - 120 * 1000; // 2分前
    await store.consume(
      [
        {
          key: "ratelimit:test:192.168.1.20",
          limit: 3,
          windowMs: 60_000,
        },
      ],
      oldWindowStart,
    );

    // 古いウィンドウなのでリセットされて成功
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.20" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("2");
  });

  it("x-real-ipヘッダーからもIPを取得できる", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: { "x-real-ip": "10.0.0.1" },
    });

    expect(res.status).toBe(200);
    expect(store.getCount("ratelimit:test:10.0.0.1")).toBe(1);
  });

  it("IPヘッダーがない場合はanonymousとして処理", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/");

    expect(res.status).toBe(200);
    expect(store.getCount("ratelimit:test:anonymous")).toBe(1);
  });

  it("cf-connecting-ip が x-forwarded-for より優先される", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: {
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      },
    });

    expect(res.status).toBe(200);
    expect(store.getCount("ratelimit:test:203.0.113.1")).toBe(1);
    expect(store.getCount("ratelimit:test:1.2.3.4")).toBe(0);
    expect(store.getCount("ratelimit:test:5.6.7.8")).toBe(0);
  });

  it("x-forwarded-for が複数IPの場合は先頭IPを使う", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
    });

    expect(res.status).toBe(200);
    expect(store.getCount("ratelimit:test:192.168.1.1")).toBe(1);
    expect(store.getCount("ratelimit:test:10.0.0.1")).toBe(0);
  });

  it("cf-connecting-ip 不在時は x-real-ip > x-forwarded-for の順", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      },
    });

    expect(res.status).toBe(200);
    expect(store.getCount("ratelimit:test:5.6.7.8")).toBe(1);
  });

  it.each([
    ["login", loginRateLimitConfig],
    ["register", registerRateLimitConfig],
    ["refresh token", tokenRateLimitConfig],
    ["contact", contactRateLimitConfig],
    ["webhook", webhookRateLimitConfig],
  ] as const)("%s parallel burst never admits more than its limit", async (_name, config) => {
    const store = newMemoryRateLimitStore();
    const app = new Hono();
    app.use("*", createRateLimitMiddleware(store, config));
    app.get("/", (c) => c.json({ ok: true }));

    const responses = await Promise.all(
      Array.from({ length: config.limit + 5 }, () =>
        app.request("/", {
          headers: { "cf-connecting-ip": "203.0.113.99" },
        }),
      ),
    );

    expect(
      responses.filter((response) => response.status === 200),
    ).toHaveLength(config.limit);
    expect(
      responses.filter((response) => response.status === 429),
    ).toHaveLength(5);
  });
});

describe("applyRateLimit", () => {
  const config = {
    windowMs: 60 * 1000,
    limit: 3,
    keyGenerator: ({ ip }: { ip: string }) => `apply:${ip}`,
  };

  function buildApp(env: Record<string, unknown>) {
    const app = new Hono();
    app.use("*", applyRateLimit(config));
    app.get("/", (c) => c.json({ ok: true }));
    return (path = "/") => app.request(path, {}, env);
  }

  it("RATE_LIMIT_STORE 未設定 + production は 503", async () => {
    const request = buildApp({ NODE_ENV: "production" });
    const res = await request();
    expect(res.status).toBe(503);
  });

  it("RATE_LIMIT_STORE 未設定 + stg は 503", async () => {
    const request = buildApp({ NODE_ENV: "stg" });
    const res = await request();
    expect(res.status).toBe(503);
  });

  it("RATE_LIMIT_STORE 未設定 + development は通過", async () => {
    const request = buildApp({ NODE_ENV: "development" });
    const res = await request();
    expect(res.status).toBe(200);
  });

  it("RATE_LIMIT_STORE 未設定 + test は通過", async () => {
    const request = buildApp({ NODE_ENV: "test" });
    const res = await request();
    expect(res.status).toBe(200);
  });

  it("RATE_LIMIT_STORE 設定済みなら通常の rate limit ロジックに委譲", async () => {
    const store = createMockStore();
    const request = buildApp({
      NODE_ENV: "production",
      RATE_LIMIT_STORE: store,
    });

    const res = await request();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
  });

  it("store error fails closed in production", async () => {
    const failingStore: RateLimitStore = {
      consume: vi.fn().mockRejectedValue(new Error("store offline")),
      acquireConcurrency: vi.fn(),
      releaseConcurrency: vi.fn(),
    };
    const request = buildApp({
      NODE_ENV: "production",
      RATE_LIMIT_STORE: failingStore,
    });
    const res = await request();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      message: "rate limit infrastructure unavailable",
    });
  });
});
