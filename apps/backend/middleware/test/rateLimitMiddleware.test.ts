import { Hono } from "hono";

import type { KeyValueStore } from "@backend/infra/kv/kv";
import { describe, expect, it, vi } from "vitest";

import {
  applyRateLimit,
  createRateLimitMiddleware,
} from "../rateLimitMiddleware";

type RateLimitRecord = {
  count: number;
  windowStart: number;
};

function createMockStore(): KeyValueStore<RateLimitRecord> & {
  data: Map<string, RateLimitRecord>;
} {
  const data = new Map<string, RateLimitRecord>();
  return {
    data,
    get: vi.fn(async (key: string) => data.get(key)),
    set: vi.fn(async (key: string, value: RateLimitRecord) => {
      data.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

describe("rateLimitMiddleware", () => {
  const createTestApp = (store: KeyValueStore<RateLimitRecord>) => {
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
    store.data.set("ratelimit:test:192.168.1.20", {
      count: 3,
      windowStart: oldWindowStart,
    });

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
    expect(store.data.has("ratelimit:test:10.0.0.1")).toBe(true);
  });

  it("IPヘッダーがない場合はanonymousとして処理", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/");

    expect(res.status).toBe(200);
    expect(store.data.has("ratelimit:test:anonymous")).toBe(true);
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
    expect(store.data.has("ratelimit:test:203.0.113.1")).toBe(true);
    expect(store.data.has("ratelimit:test:1.2.3.4")).toBe(false);
    expect(store.data.has("ratelimit:test:5.6.7.8")).toBe(false);
  });

  it("x-forwarded-for が複数IPの場合は先頭IPを使う", async () => {
    const store = createMockStore();
    const app = createTestApp(store);

    const res = await app.request("/", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
    });

    expect(res.status).toBe(200);
    expect(store.data.has("ratelimit:test:192.168.1.1")).toBe(true);
    expect(store.data.has("ratelimit:test:10.0.0.1")).toBe(false);
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
    expect(store.data.has("ratelimit:test:5.6.7.8")).toBe(true);
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

  it("RATE_LIMIT_KV 未設定 + production は 503", async () => {
    const request = buildApp({ NODE_ENV: "production" });
    const res = await request();
    expect(res.status).toBe(503);
  });

  it("RATE_LIMIT_KV 未設定 + stg は 503", async () => {
    const request = buildApp({ NODE_ENV: "stg" });
    const res = await request();
    expect(res.status).toBe(503);
  });

  it("RATE_LIMIT_KV 未設定 + development は通過", async () => {
    const request = buildApp({ NODE_ENV: "development" });
    const res = await request();
    expect(res.status).toBe(200);
  });

  it("RATE_LIMIT_KV 未設定 + test は通過", async () => {
    const request = buildApp({ NODE_ENV: "test" });
    const res = await request();
    expect(res.status).toBe(200);
  });

  it("RATE_LIMIT_KV 設定済みなら通常の rate limit ロジックに委譲", async () => {
    const store = createMockStore();
    const request = buildApp({
      NODE_ENV: "production",
      RATE_LIMIT_KV: store,
    });

    const res = await request();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
  });
});
