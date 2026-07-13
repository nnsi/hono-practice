import type {
  RateLimitCounterPort,
  RateLimitDecision,
  RateLimitState,
} from "@backend/port/rateLimit";

type Counter = { count: number; windowStart: number };

function counterKey(partitionKey: string, ruleKey: string): string {
  return JSON.stringify([partitionKey, ruleKey]);
}

/** In-process implementation for tests and single-process local development. */
export function newMemoryRateLimitStore(): RateLimitCounterPort & {
  clear(): void;
  getCount(partitionKey: string, ruleKey?: string): number;
} {
  const counters = new Map<string, Counter>();

  return {
    async consume({ partitionKey, rules }, requestedNow = Date.now()) {
      const records = rules.map((rule) => {
        const storageKey = counterKey(partitionKey, rule.key);
        const current = counters.get(storageKey);
        return {
          storageKey,
          rule,
          record:
            !current || requestedNow - current.windowStart >= rule.windowMs
              ? { count: 0, windowStart: requestedNow }
              : current,
        };
      });
      const exceeded = records.filter(
        ({ rule, record }) => record.count >= rule.limit,
      );
      const allowed = exceeded.length === 0;
      if (allowed) {
        for (const { storageKey, record } of records) {
          counters.set(storageKey, {
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
        retryAfterMs:
          exceeded.length === 0
            ? 0
            : Math.max(
                0,
                ...exceeded.map(
                  ({ rule, record }) =>
                    record.windowStart + rule.windowMs - requestedNow,
                ),
              ),
      } satisfies RateLimitDecision;
    },

    clear() {
      counters.clear();
    },
    getCount(partitionKey, ruleKey = "request") {
      return counters.get(counterKey(partitionKey, ruleKey))?.count ?? 0;
    },
  };
}
