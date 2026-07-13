import type {
  ConcurrencyDecision,
  RateLimitDecision,
  RateLimitState,
  RateLimitStore,
} from "./rateLimitStore";

export type RedisEvalClient = {
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
};

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
local raw = redis.call('GET', KEYS[1])
local count = raw and tonumber(raw) or 0
local limit = tonumber(ARGV[1])
if count >= limit then return {0, count} end
count = count + 1
redis.call('SET', KEYS[1], tostring(count), 'PX', tonumber(ARGV[2]))
return {1, count}
`;

const RELEASE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local count = tonumber(raw)
if count <= 1 then redis.call('DEL', KEYS[1]) return 0 end
redis.call('DECR', KEYS[1])
return count - 1
`;

export function newRedisRateLimitStore(
  client: RedisEvalClient,
): RateLimitStore {
  return {
    async consume(rules, now = Date.now()) {
      if (rules.length === 0) {
        return { allowed: true, states: [], retryAfterMs: 0 };
      }
      const keys = rules.map((rule) => `atomic-rate:${rule.key}`);
      const args = rules.flatMap((rule) => [
        String(rule.limit),
        String(rule.windowMs),
        String(now),
      ]);
      const raw = toNumberArray(
        await client.eval(CONSUME_SCRIPT, { keys, arguments: args }),
        1 + rules.length * 2,
      );
      const exceededIndex = Number(raw[0]);
      const allowed = exceededIndex === 0;
      const states: RateLimitState[] = rules.map((rule, index) => {
        const count = Number(raw[1 + index * 2]);
        const windowStart = Number(raw[2 + index * 2]);
        return {
          key: rule.key,
          count,
          remaining: Math.max(0, rule.limit - count),
          resetAt: windowStart + rule.windowMs,
        };
      });
      const exceededState =
        exceededIndex > 0 ? states[exceededIndex - 1] : undefined;
      return {
        allowed,
        states,
        retryAfterMs: exceededState
          ? Math.max(0, exceededState.resetAt - now)
          : 0,
      } satisfies RateLimitDecision;
    },

    async acquireConcurrency(key, limit, ttlMs) {
      const raw = toNumberArray(
        await client.eval(ACQUIRE_SCRIPT, {
          keys: [`atomic-concurrency:${key}`],
          arguments: [String(limit), String(ttlMs)],
        }),
        2,
      );
      return {
        allowed: Number(raw[0]) === 1,
        current: Number(raw[1]),
      } satisfies ConcurrencyDecision;
    },

    async releaseConcurrency(key) {
      await client.eval(RELEASE_SCRIPT, {
        keys: [`atomic-concurrency:${key}`],
        arguments: [],
      });
    },
  };
}
