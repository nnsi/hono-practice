import type { Config } from "@backend/config";
import type { HonoContext } from "@backend/context";
import { AIQuotaError } from "@backend/error";
import type { RateLimitRule } from "@backend/infra/rateLimit";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MONTH = 30 * DAY;
const CONCURRENCY_LEASE_MS = 5 * MINUTE;

type Reservation = { release(): Promise<void> };

function isProductionLike(env: Config): boolean {
  return env.NODE_ENV === "production" || env.NODE_ENV === "stg";
}

function newReservation(release: () => Promise<void>): Reservation {
  let released = false;
  return {
    release() {
      if (released) return Promise.resolve();
      released = true;
      return release();
    },
  };
}

function releasePreservingError(
  reservation: Reservation,
  error: unknown,
  c: Pick<HonoContext, "get">,
): Promise<never> {
  return reservation.release().then(
    () => Promise.reject(error),
    (releaseError) => {
      c.get("logger")?.error("AI concurrency release failed", {
        error:
          releaseError instanceof Error
            ? releaseError.message
            : String(releaseError),
      });
      return Promise.reject(error);
    },
  );
}

function mapStoreFailure(
  error: unknown,
  c: Pick<HonoContext, "env" | "get">,
): Reservation {
  if (error instanceof AIQuotaError) throw error;
  c.get("logger")?.error("AI quota store unavailable", {
    error: error instanceof Error ? error.message : String(error),
  });
  if (isProductionLike(c.env)) {
    throw new AIQuotaError(
      {
        error: {
          code: "AI_QUOTA_UNAVAILABLE",
          message: "AI quota service unavailable",
        },
      },
      503,
    );
  }
  return { release: () => Promise.resolve() };
}

function quotaRules(
  env: Config,
  userId: string,
  apiKeyId: string | undefined,
): RateLimitRule[] {
  const rules: RateLimitRule[] = [
    {
      key: `ai:user:${userId}:minute`,
      limit: env.AI_USER_QUOTA_PER_MINUTE,
      windowMs: MINUTE,
    },
    {
      key: `ai:user:${userId}:day`,
      limit: env.AI_USER_QUOTA_PER_DAY,
      windowMs: DAY,
    },
    {
      key: `ai:user:${userId}:month`,
      limit: env.AI_USER_QUOTA_PER_MONTH,
      windowMs: MONTH,
    },
  ];
  if (apiKeyId) {
    rules.push(
      {
        key: `ai:api-key:${apiKeyId}:minute`,
        limit: env.AI_API_KEY_QUOTA_PER_MINUTE,
        windowMs: MINUTE,
      },
      {
        key: `ai:api-key:${apiKeyId}:day`,
        limit: env.AI_API_KEY_QUOTA_PER_DAY,
        windowMs: DAY,
      },
      {
        key: `ai:api-key:${apiKeyId}:month`,
        limit: env.AI_API_KEY_QUOTA_PER_MONTH,
        windowMs: MONTH,
      },
    );
  }
  return rules;
}

export async function reserveAIUsage(
  c: Pick<HonoContext, "env" | "get">,
): Promise<Reservation> {
  const store = c.env.RATE_LIMIT_STORE;
  if (!store) {
    if (isProductionLike(c.env)) {
      throw new AIQuotaError(
        {
          error: {
            code: "AI_QUOTA_UNAVAILABLE",
            message: "AI quota service unavailable",
          },
        },
        503,
      );
    }
    return { release: () => Promise.resolve() };
  }

  const userId = c.get("userId");
  const concurrencyKey = `ai:concurrency:user:${userId}`;
  return store
    .acquireConcurrency(
      concurrencyKey,
      c.env.AI_MAX_CONCURRENCY,
      CONCURRENCY_LEASE_MS,
    )
    .then((concurrency) => {
      if (!concurrency.allowed) {
        throw new AIQuotaError(
          {
            error: {
              code: "AI_CONCURRENCY_EXCEEDED",
              message: "Too many concurrent AI requests",
            },
          },
          429,
        );
      }

      const reservation = newReservation(() =>
        store.releaseConcurrency(concurrencyKey),
      );
      return store.consume(quotaRules(c.env, userId, c.get("apiKeyId"))).then(
        (decision) => {
          if (!decision.allowed) {
            const quotaError = new AIQuotaError(
              {
                error: {
                  code: "AI_QUOTA_EXCEEDED",
                  message: "AI quota exceeded",
                  retryAfterSeconds: Math.max(
                    1,
                    Math.ceil(decision.retryAfterMs / 1000),
                  ),
                },
              },
              429,
            );
            return releasePreservingError(reservation, quotaError, c);
          }
          return reservation;
        },
        (error) => releasePreservingError(reservation, error, c),
      );
    })
    .catch((error) => mapStoreFailure(error, c));
}
