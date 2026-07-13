import type {
  AtomicCounterDecision,
  AtomicCounterState,
  ConcurrencyLeaseDecision,
  RateLimitPorts,
} from "@backend/port/rateLimit";

type Counter = { count: number; windowStart: number };
type LeaseMap = Map<string, number>;

function counterKey(partitionKey: string, ruleKey: string): string {
  return JSON.stringify([partitionKey, ruleKey]);
}

function newLeaseId(): string {
  return crypto.randomUUID();
}

/** In-process implementation for tests and single-process local development. */
export function newMemoryRateLimitStore(): RateLimitPorts & {
  clear(): void;
  getCount(partitionKey: string, ruleKey?: string): number;
} {
  const counters = new Map<string, Counter>();
  const leases = new Map<string, LeaseMap>();

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
      const exceeded = records.find(
        ({ rule, record }) => record.count >= rule.limit,
      );
      const allowed = !exceeded;
      if (allowed) {
        for (const { storageKey, record } of records) {
          counters.set(storageKey, {
            count: record.count + 1,
            windowStart: record.windowStart,
          });
        }
      }
      const states: AtomicCounterState[] = records.map(({ rule, record }) => {
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
      } satisfies AtomicCounterDecision;
    },

    async acquireConcurrency(key, limit, ttlMs, requestedNow = Date.now()) {
      const active = leases.get(key) ?? new Map<string, number>();
      for (const [leaseId, expiresAt] of active) {
        if (expiresAt <= requestedNow) active.delete(leaseId);
      }
      if (active.size >= limit) {
        leases.set(key, active);
        return {
          allowed: false,
          current: active.size,
        } satisfies ConcurrencyLeaseDecision;
      }
      const leaseId = newLeaseId();
      active.set(leaseId, requestedNow + ttlMs);
      leases.set(key, active);
      return {
        allowed: true,
        current: active.size,
        leaseId,
      } satisfies ConcurrencyLeaseDecision;
    },

    async releaseConcurrency(key, leaseId) {
      const active = leases.get(key);
      if (!active) return;
      active.delete(leaseId);
      if (active.size === 0) leases.delete(key);
    },

    clear() {
      counters.clear();
      leases.clear();
    },
    getCount(partitionKey, ruleKey = "request") {
      return counters.get(counterKey(partitionKey, ruleKey))?.count ?? 0;
    },
  };
}
