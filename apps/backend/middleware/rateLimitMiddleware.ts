import type { MiddlewareHandler } from "hono";

import type { KeyValueStore } from "@backend/infra/kv/kv";

type RateLimitRecord = {
  count: number;
  windowStart: number;
};

type RateLimitConfig = {
  windowMs: number;
  limit: number;
  keyGenerator: (c: { ip: string; path: string }) => string;
};

/**
 * 固定ウィンドウ方式のレートリミットミドルウェアを作成
 */
export function createRateLimitMiddleware(
  store: KeyValueStore<RateLimitRecord>,
  config: RateLimitConfig,
): MiddlewareHandler {
  const { windowMs, limit, keyGenerator } = config;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "anonymous";
    const path = c.req.path;

    const key = `ratelimit:${keyGenerator({ ip, path })}`;
    const now = Date.now();

    const record = await store.get(key);

    if (!record || now - record.windowStart >= windowMs) {
      // 新しいウィンドウを開始
      const windowStart = now;
      await store.set(key, { count: 1, windowStart }, windowSeconds);

      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", String(limit - 1));
      c.header(
        "X-RateLimit-Reset",
        String(Math.ceil((windowStart + windowMs) / 1000)),
      );

      await next();
      return;
    }

    if (record.count >= limit) {
      // レート制限超過
      const retryAfter = Math.ceil(
        (record.windowStart + windowMs - now) / 1000,
      );
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", "0");
      c.header(
        "X-RateLimit-Reset",
        String(Math.ceil((record.windowStart + windowMs) / 1000)),
      );
      return c.json({ message: "too many requests" }, 429);
    }

    // カウントを増やす
    const remaining = limit - record.count - 1;
    await store.set(
      key,
      { count: record.count + 1, windowStart: record.windowStart },
      windowSeconds,
    );

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil((record.windowStart + windowMs) / 1000)),
    );

    await next();
  };
}

/**
 * ログイン用レートリミット設定
 * 15分間に5回まで
 */
export const loginRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: ({ ip }) => `login:${ip}`,
};

/**
 * トークンリフレッシュ用レートリミット設定
 * 1分間に10回まで
 */
export const tokenRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: ({ ip }) => `token:${ip}`,
};

/**
 * ユーザー登録用レートリミット設定
 * 1時間に5回まで
 */
export const registerRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: ({ ip }) => `register:${ip}`,
};
