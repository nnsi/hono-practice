export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitState = {
  key: string;
  count: number;
  remaining: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  states: RateLimitState[];
  /** Wait until every rule that blocked this decision has reset. */
  retryAfterMs: number;
};

/**
 * A set of counters evaluated from one adapter snapshot.
 * Adapters must isolate equal rule keys that belong to different partitions and
 * update every rule together when the decision is allowed. Persistence
 * consistency is adapter-specific, so callers must treat this as a soft limit.
 */
export type RateLimitBatch = {
  partitionKey: string;
  rules: RateLimitRule[];
};

export type RateLimitCounterPort = {
  consume(batch: RateLimitBatch, now?: number): Promise<RateLimitDecision>;
};
