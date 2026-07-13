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
  retryAfterMs: number;
};

export type ConcurrencyDecision = {
  allowed: boolean;
  current: number;
};

/**
 * Counters must be updated atomically. Implementations are shared by request
 * rate limiting and AI cost controls so a concurrent burst cannot pass a
 * read-modify-write race.
 */
export type RateLimitStore = {
  consume(rules: RateLimitRule[], now?: number): Promise<RateLimitDecision>;
  acquireConcurrency(
    key: string,
    limit: number,
    ttlMs: number,
    now?: number,
  ): Promise<ConcurrencyDecision>;
  releaseConcurrency(key: string): Promise<void>;
};
