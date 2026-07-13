import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppContext } from "@backend/context";
import type { Tracer } from "@backend/lib/tracer";
import type {
  RateLimitCounterPort,
  RateLimitDecision,
} from "@backend/port/rateLimit";
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

type StoreResult =
  | { ok: true; decision: RateLimitDecision }
  | { ok: false; error: unknown };

function consume(
  store: RateLimitCounterPort,
  config: RateLimitConfig,
  ip: string,
  path: string,
  tracer?: Tracer,
): Promise<StoreResult> {
  const key = `ratelimit:${config.keyGenerator({ ip, path })}`;
  const operation = () =>
    store.consume(
      {
        partitionKey: key,
        rules: [
          { key: "request", limit: config.limit, windowMs: config.windowMs },
        ],
      },
      Date.now(),
    );
  const request = tracer
    ? tracer.span("kv.rate-limit.consume", operation)
    : operation();
  return request.then(
    (decision): StoreResult => ({ ok: true, decision }),
    (error): StoreResult => ({ ok: false, error }),
  );
}

async function continueWithDecision(
  c: Parameters<MiddlewareHandler>[0],
  next: Parameters<MiddlewareHandler>[1],
  config: RateLimitConfig,
  decision: RateLimitDecision,
) {
  const state = decision.states[0];
  if (!decision.allowed) {
    const retryAfter = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    c.header("Retry-After", String(retryAfter));
    c.header("X-RateLimit-Limit", String(config.limit));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
    return c.json({ message: "too many requests" }, 429);
  }

  c.header("X-RateLimit-Limit", String(config.limit));
  c.header("X-RateLimit-Remaining", String(state.remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
  await next();
}

export function createRateLimitMiddleware(
  store: RateLimitCounterPort,
  config: RateLimitConfig,
  tracer?: Tracer,
): MiddlewareHandler {
  return async (c, next) => {
    const result = await consume(
      store,
      config,
      getClientIp(c),
      c.req.path,
      tracer,
    );
    if (!result.ok) throw result.error;
    return continueWithDecision(c, next, config, result.decision);
  };
}

export function applyRateLimit(
  config: RateLimitConfig,
): MiddlewareHandler<AppContext> {
  return createMiddleware<AppContext>(async (c, next) => {
    const store = c.env.RATE_LIMIT_STORE;
    if (!store) {
      if (c.env.NODE_ENV === "production" || c.env.NODE_ENV === "stg") {
        return c.json(
          { message: "rate limit infrastructure unavailable" },
          503,
        );
      }
      return next();
    }

    const result = await consume(
      store,
      config,
      getClientIp(c),
      c.req.path,
      c.get("tracer"),
    );
    if (!result.ok) {
      c.get("logger")?.error("Rate limit store unavailable", {
        error:
          result.error instanceof Error
            ? result.error.message
            : String(result.error),
      });
      if (c.env.NODE_ENV === "production" || c.env.NODE_ENV === "stg") {
        return c.json(
          { message: "rate limit infrastructure unavailable" },
          503,
        );
      }
      return next();
    }
    return continueWithDecision(c, next, config, result.decision);
  });
}
