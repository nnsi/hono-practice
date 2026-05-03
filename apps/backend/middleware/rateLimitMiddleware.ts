import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppContext } from "@backend/context";
import type { KeyValueStore } from "@backend/infra/kv/kv";
import type { Tracer } from "@backend/lib/tracer";
import { fireAndForget } from "@backend/utils/fireAndForget";
import { getClientIp } from "@backend/utils/getClientIp";

import type { RateLimitConfig } from "./rateLimitConfigs";

export {
  clientErrorRateLimitConfig,
  contactRateLimitConfig,
  loginRateLimitConfig,
  registerRateLimitConfig,
  tokenRateLimitConfig,
} from "./rateLimitConfigs";

export type RateLimitRecord = {
  count: number;
  windowStart: number;
};

/**
 * 固定ウィンドウ方式のレートリミットミドルウェアを作成
 */
export function createRateLimitMiddleware(
  store: KeyValueStore<RateLimitRecord>,
  config: RateLimitConfig,
  tracer?: Tracer,
): MiddlewareHandler {
  const { windowMs, limit, keyGenerator } = config;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (c, next) => {
    const t = tracer;
    const ip = getClientIp(c);
    const path = c.req.path;

    const key = `ratelimit:${keyGenerator({ ip, path })}`;
    const now = Date.now();

    const record = t
      ? await t.span("kv.getRateLimit", () => store.get(key))
      : await store.get(key);

    if (!record || now - record.windowStart >= windowMs) {
      // 新しいウィンドウを開始 — set は非ブロッキングで実行
      const windowStart = now;
      const setPromise = store.set(
        key,
        { count: 1, windowStart },
        windowSeconds,
      );
      fireAndForget(c, setPromise);

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

    // カウントを増やす — set は非ブロッキングで実行
    const remaining = limit - record.count - 1;
    const setPromise = store.set(
      key,
      { count: record.count + 1, windowStart: record.windowStart },
      windowSeconds,
    );
    fireAndForget(c, setPromise);

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
 * 共通ヘルパー: KV があれば rate limit を適用、無ければ環境に応じて fail-close。
 * production / stg では KV 未設定は設定不備なので 503 を返す（fail-open しない）。
 * development / test では未設定でもスキップ（ローカル開発の利便性）。
 */
export function applyRateLimit(
  config: RateLimitConfig,
): MiddlewareHandler<AppContext> {
  return createMiddleware<AppContext>(async (c, next) => {
    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) {
      const nodeEnv = c.env.NODE_ENV;
      if (nodeEnv === "production" || nodeEnv === "stg") {
        return c.json(
          { message: "rate limit infrastructure unavailable" },
          503,
        );
      }
      return next();
    }
    return createRateLimitMiddleware(kv, config, c.get("tracer"))(c, next);
  });
}
