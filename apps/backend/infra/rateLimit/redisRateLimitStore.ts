import type {
  RateLimitCounterPort,
  RateLimitDecision,
  RateLimitState,
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
  // slot, which lets Redis provide a stronger guarantee than the shared port.
  return `rate-limit:{${redisSegment(partitionKey)}}:${redisSegment(ruleKey)}`;
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

export function newRedisRateLimitStore(
  client: RedisEvalClient,
): RateLimitCounterPort {
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
      const states: RateLimitState[] = rules.map((rule, index) => {
        const count = raw[1 + index * 2];
        return {
          key: rule.key,
          count,
          remaining: Math.max(0, rule.limit - count),
          resetAt: raw[2 + index * 2] + rule.windowMs,
        };
      });
      const exceeded = states.filter(
        (state, index) => state.count >= rules[index].limit,
      );
      return {
        allowed: exceededIndex === 0,
        states,
        retryAfterMs:
          exceededIndex === 0
            ? 0
            : Math.max(0, ...exceeded.map((state) => state.resetAt - now)),
      } satisfies RateLimitDecision;
    },
  };
}
