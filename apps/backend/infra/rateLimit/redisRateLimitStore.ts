import type {
  AtomicCounterDecision,
  AtomicCounterState,
  ConcurrencyLeaseDecision,
  RateLimitPorts,
} from "@backend/port/rateLimit";

export type RedisEvalClient = {
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
};

function redisSegment(value: string): string {
  return encodeURIComponent(value);
}

function counterKey(partitionKey: string, ruleKey: string): string {
  // The hash tag keeps every rule in one partition on the same Redis Cluster
  // slot, which is required for the atomic multi-key Lua script.
  return `atomic-rate:{${redisSegment(partitionKey)}}:${redisSegment(ruleKey)}`;
}

function toNumberArray(value: unknown, minimumLength: number): number[] {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new Error("Invalid Redis rate limit response");
  }
  return value.map((item) => {
    const number = Number(item);
    if (!Number.isFinite(number)) {
      throw new Error("Invalid Redis rate limit response");
    }
    return number;
  });
}

const CONSUME_SCRIPT = `
local records = {}
local exceeded = 0
for i, key in ipairs(KEYS) do
  local offset = (i - 1) * 3
  local limit = tonumber(ARGV[offset + 1])
  local window = tonumber(ARGV[offset + 2])
  local now = tonumber(ARGV[offset + 3])
  local raw = redis.call('GET', key)
  local count = 0
  local windowStart = now
  if raw then
    local record = cjson.decode(raw)
    if now - tonumber(record.windowStart) < window then
      count = tonumber(record.count)
      windowStart = tonumber(record.windowStart)
    end
  end
  records[i] = { count = count, windowStart = windowStart, limit = limit, window = window }
  if count >= limit and exceeded == 0 then exceeded = i end
end
if exceeded == 0 then
  for i, key in ipairs(KEYS) do
    local record = records[i]
    record.count = record.count + 1
    redis.call('SET', key, cjson.encode({ count = record.count, windowStart = record.windowStart }), 'PX', record.window)
  end
end
local output = { exceeded }
for i, record in ipairs(records) do
  table.insert(output, record.count)
  table.insert(output, record.windowStart)
end
return output
`;

const ACQUIRE_SCRIPT = `
local now = tonumber(ARGV[1])
local expiresAt = now + tonumber(ARGV[2])
local leaseId = ARGV[3]
local limit = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
local current = redis.call('ZCARD', KEYS[1])
if current >= limit then return {0, current, ''} end
if redis.call('ZSCORE', KEYS[1], leaseId) then return {-1, current, ''} end
redis.call('ZADD', KEYS[1], expiresAt, leaseId)
local latest = redis.call('ZRANGE', KEYS[1], -1, -1, 'WITHSCORES')
redis.call('PEXPIREAT', KEYS[1], latest[2])
return {1, current + 1, leaseId}
`;

const RELEASE_SCRIPT = `
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
local current = redis.call('ZCARD', KEYS[1])
if current == 0 then
  redis.call('DEL', KEYS[1])
else
  local latest = redis.call('ZRANGE', KEYS[1], -1, -1, 'WITHSCORES')
  redis.call('PEXPIREAT', KEYS[1], latest[2])
end
return removed
`;

function parseLeaseDecision(value: unknown): ConcurrencyLeaseDecision {
  if (!Array.isArray(value) || value.length < 3) {
    throw new Error("Invalid Redis rate limit response");
  }
  const allowed = Number(value[0]);
  const current = Number(value[1]);
  if (!Number.isFinite(current) || (allowed !== 0 && allowed !== 1)) {
    throw new Error("Invalid Redis rate limit response");
  }
  if (allowed === 0) return { allowed: false, current };
  const leaseId = value[2];
  if (typeof leaseId !== "string" || leaseId.length === 0) {
    throw new Error("Invalid Redis rate limit response");
  }
  return { allowed: true, current, leaseId };
}

export function newRedisRateLimitStore(
  client: RedisEvalClient,
): RateLimitPorts {
  return {
    async consume({ partitionKey, rules }, now = Date.now()) {
      if (rules.length === 0) {
        return { allowed: true, states: [], retryAfterMs: 0 };
      }
      const raw = toNumberArray(
        await client.eval(CONSUME_SCRIPT, {
          keys: rules.map((rule) => counterKey(partitionKey, rule.key)),
          arguments: rules.flatMap((rule) => [
            String(rule.limit),
            String(rule.windowMs),
            String(now),
          ]),
        }),
        1 + rules.length * 2,
      );
      const exceededIndex = raw[0];
      const states: AtomicCounterState[] = rules.map((rule, index) => {
        const count = raw[1 + index * 2];
        return {
          key: rule.key,
          count,
          remaining: Math.max(0, rule.limit - count),
          resetAt: raw[2 + index * 2] + rule.windowMs,
        };
      });
      const exceeded =
        exceededIndex > 0 ? states[exceededIndex - 1] : undefined;
      return {
        allowed: exceededIndex === 0,
        states,
        retryAfterMs: exceeded ? Math.max(0, exceeded.resetAt - now) : 0,
      } satisfies AtomicCounterDecision;
    },

    async acquireConcurrency(key, limit, ttlMs, now = Date.now()) {
      const leaseId = crypto.randomUUID();
      return parseLeaseDecision(
        await client.eval(ACQUIRE_SCRIPT, {
          keys: [`atomic-concurrency:${key}`],
          arguments: [String(now), String(ttlMs), leaseId, String(limit)],
        }),
      );
    },

    async releaseConcurrency(key, leaseId) {
      await client.eval(RELEASE_SCRIPT, {
        keys: [`atomic-concurrency:${key}`],
        arguments: [leaseId],
      });
    },
  };
}
