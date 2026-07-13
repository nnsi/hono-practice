export type AtomicCounterRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type AtomicCounterState = {
  key: string;
  count: number;
  remaining: number;
  resetAt: number;
};

export type AtomicCounterDecision = {
  allowed: boolean;
  states: AtomicCounterState[];
  retryAfterMs: number;
};

/**
 * A set of counters that must be consumed atomically within one stable scope.
 * Adapters must isolate equal rule keys that belong to different partitions.
 */
export type AtomicCounterBatch = {
  partitionKey: string;
  rules: AtomicCounterRule[];
};

export type AtomicCounterPort = {
  consume(
    batch: AtomicCounterBatch,
    now?: number,
  ): Promise<AtomicCounterDecision>;
};

export type ConcurrencyLeaseDecision =
  | { allowed: true; current: number; leaseId: string }
  | { allowed: false; current: number };

export type ConcurrencyLeasePort = {
  acquireConcurrency(
    key: string,
    limit: number,
    ttlMs: number,
    now?: number,
  ): Promise<ConcurrencyLeaseDecision>;
  releaseConcurrency(key: string, leaseId: string): Promise<void>;
};

/** Composition-root binding implemented by Redis, Durable Objects, or memory. */
export type RateLimitPorts = AtomicCounterPort & ConcurrencyLeasePort;
