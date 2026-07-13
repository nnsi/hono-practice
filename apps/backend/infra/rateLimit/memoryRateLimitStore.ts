import type {
  ConcurrencyDecision,
  RateLimitDecision,
  RateLimitState,
  RateLimitStore,
} from "./rateLimitStore";

type Counter = { count: number; windowStart: number };
type ConcurrencyCounter = { count: number; expiresAt: number };

/** In-process implementation for tests and single-process local development. */
export function newMemoryRateLimitStore(): RateLimitStore & {
  clear(): void;
  getCount(key: string): number;
} {
  const counters = new Map<string, Counter>();
  const concurrency = new Map<string, ConcurrencyCounter>();

  return {
    async consume(rules, requestedNow = Date.now()) {
      const records = rules.map((rule) => {
        const current = counters.get(rule.key);
        return {
          rule,
          record:
            !current || requestedNow - current.windowStart >= rule.windowMs
              ? { count: 0, windowStart: requestedNow }
              : current,
        };
      });

      const exceeded = records.find(
        ({ rule, record }) => record.count >= rule.limit,
      );
      const allowed = !exceeded;
      if (allowed) {
        for (const { rule, record } of records) {
          counters.set(rule.key, {
            count: record.count + 1,
            windowStart: record.windowStart,
          });
        }
      }

      const states: RateLimitState[] = records.map(({ rule, record }) => {
        const count = record.count + (allowed ? 1 : 0);
        return {
          key: rule.key,
          count,
          remaining: Math.max(0, rule.limit - count),
          resetAt: record.windowStart + rule.windowMs,
        };
      });
      return {
        allowed,
        states,
        retryAfterMs: exceeded
          ? Math.max(
              0,
              exceeded.record.windowStart +
                exceeded.rule.windowMs -
                requestedNow,
            )
          : 0,
      } satisfies RateLimitDecision;
    },

    async acquireConcurrency(key, limit, ttlMs, requestedNow = Date.now()) {
      const existing = concurrency.get(key);
      const current =
        !existing || existing.expiresAt <= requestedNow
          ? { count: 0, expiresAt: requestedNow + ttlMs }
          : existing;
      if (current.count >= limit) {
        return { allowed: false, current: current.count };
      }
      const next = {
        count: current.count + 1,
        expiresAt: requestedNow + ttlMs,
      };
      concurrency.set(key, next);
      return {
        allowed: true,
        current: next.count,
      } satisfies ConcurrencyDecision;
    },

    async releaseConcurrency(key) {
      const current = concurrency.get(key);
      if (!current) return;
      if (current.count <= 1) concurrency.delete(key);
      else concurrency.set(key, { ...current, count: current.count - 1 });
    },

    clear() {
      counters.clear();
      concurrency.clear();
    },
    getCount(key) {
      return counters.get(key)?.count ?? 0;
    },
  };
}
