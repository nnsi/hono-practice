import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppContext } from "@backend/context";
import type { RateLimitStore } from "@backend/infra/rateLimit";
import type { Tracer } from "@backend/lib/tracer";
import { getClientIp } from "@backend/utils/getClientIp";

import type { RateLimitConfig } from "./rateLimitConfigs";

export {
  clientErrorRateLimitConfig,
  contactRateLimitConfig,
  loginRateLimitConfig,
  registerRateLimitConfig,
  tokenRateLimitConfig,
  webhookRateLimitConfig,
} from "./rateLimitConfigs";

/**
 * 固定ウィンドウ方式のレートリミットミドルウェアを作成
 */
export function createRateLimitMiddleware(
  store: RateLimitStore,
  config: RateLimitConfig,
  tracer?: Tracer,
): MiddlewareHandler {
  const { windowMs, limit, keyGenerator } = config;
  return async (c, next) => {
    const t = tracer;
    const ip = getClientIp(c);
    const path = c.req.path;

    const key = `ratelimit:${keyGenerator({ ip, path })}`;
    const now = Date.now();

    const decision = t
      ? await t.span("kv.consumeRateLimit", () =>
          store.consume([{ key, limit, windowMs }], now),
        )
      : await store.consume([{ key, limit, windowMs }], now);
    const state = decision.states[0];

    if (!decision.allowed) {
      // レート制限超過
      const retryAfter = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
      return c.json({ message: "too many requests" }, 429);
    }

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(state.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));

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
    const store = c.env.RATE_LIMIT_STORE;
    if (!store) {
      const nodeEnv = c.env.NODE_ENV;
      if (nodeEnv === "production" || nodeEnv === "stg") {
        return c.json(
          { message: "rate limit infrastructure unavailable" },
          503,
        );
      }
      return next();
    }
    return Promise.resolve(
      createRateLimitMiddleware(store, config, c.get("tracer"))(c, next),
    ).catch((error: unknown) => {
      c.get("logger")?.error("Rate limit store unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (c.env.NODE_ENV === "production" || c.env.NODE_ENV === "stg") {
        c.res = c.json(
          { message: "rate limit infrastructure unavailable" },
          503,
        );
        return;
      }
      return next();
    });
  });
}
