import { describe, expect, it, vi } from "vitest";

import {
  type RedisEvalClient,
  newRedisRateLimitStore,
} from "./redisRateLimitStore";

function clientWithResults(...results: unknown[]) {
  const evalMock = vi.fn();
  for (const result of results) evalMock.mockResolvedValueOnce(result);
  const client: RedisEvalClient = { eval: evalMock };
  return { client, evalMock };
}

describe("Redis rate limit store", () => {
  it("invokes the Redis multi-rule script and maps its return values", async () => {
    const { client, evalMock } = clientWithResults([0, 1, 100, 1, 100]);
    const store = newRedisRateLimitStore(client);

    const decision = await store.consume(
      {
        partitionKey: "user:123",
        rules: [
          { key: "minute", limit: 2, windowMs: 1_000 },
          { key: "day", limit: 10, windowMs: 10_000 },
        ],
      },
      100,
    );

    expect(decision).toEqual({
      allowed: true,
      states: [
        { key: "minute", count: 1, remaining: 1, resetAt: 1_100 },
        { key: "day", count: 1, remaining: 9, resetAt: 10_100 },
      ],
      retryAfterMs: 0,
    });
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining("if exceeded == 0 then"),
      {
        keys: ["rate-limit:{user%3A123}:minute", "rate-limit:{user%3A123}:day"],
        arguments: ["2", "1000", "100", "10", "10000", "100"],
      },
    );
  });

  it("propagates Redis failures and rejects malformed returns", async () => {
    const evalMock = vi.fn().mockRejectedValue(new Error("redis unavailable"));
    const client: RedisEvalClient = { eval: evalMock };
    const store = newRedisRateLimitStore(client);

    await expect(
      store.consume({
        partitionKey: "user:123",
        rules: [{ key: "minute", limit: 1, windowMs: 1_000 }],
      }),
    ).rejects.toThrow("redis unavailable");

    evalMock.mockResolvedValueOnce(["invalid", 1, 100]);
    await expect(
      store.consume({
        partitionKey: "user:123",
        rules: [{ key: "minute", limit: 1, windowMs: 1_000 }],
      }),
    ).rejects.toThrow("Invalid Redis rate limit response");
  });

  it("waits for every exceeded rule to reset before retrying", async () => {
    const { client } = clientWithResults([1, 1, 100, 1, 100]);
    const store = newRedisRateLimitStore(client);

    await expect(
      store.consume(
        {
          partitionKey: "user:retry",
          rules: [
            { key: "short", limit: 1, windowMs: 1_000 },
            { key: "long", limit: 1, windowMs: 10_000 },
          ],
        },
        200,
      ),
    ).resolves.toMatchObject({ allowed: false, retryAfterMs: 9_900 });
  });
});
