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
  it("invokes the atomic multi-rule script and maps its return values", async () => {
    const { client, evalMock } = clientWithResults([0, 1, 100, 1, 100]);
    const store = newRedisRateLimitStore(client);

    const decision = await store.consume(
      [
        { key: "minute", limit: 2, windowMs: 1_000 },
        { key: "day", limit: 10, windowMs: 10_000 },
      ],
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
        keys: ["atomic-rate:minute", "atomic-rate:day"],
        arguments: ["2", "1000", "100", "10", "10000", "100"],
      },
    );
  });

  it("invokes concurrency acquire and release scripts", async () => {
    const { client, evalMock } = clientWithResults([1, 1], 0);
    const store = newRedisRateLimitStore(client);

    await expect(store.acquireConcurrency("user-1", 2, 5_000)).resolves.toEqual(
      { allowed: true, current: 1 },
    );
    await store.releaseConcurrency("user-1");

    expect(evalMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("if count >= limit"),
      {
        keys: ["atomic-concurrency:user-1"],
        arguments: ["2", "5000"],
      },
    );
    expect(evalMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("redis.call('DECR'"),
      { keys: ["atomic-concurrency:user-1"], arguments: [] },
    );
  });

  it("propagates Redis failures and rejects malformed returns", async () => {
    const evalMock = vi.fn().mockRejectedValue(new Error("redis unavailable"));
    const client: RedisEvalClient = { eval: evalMock };
    const store = newRedisRateLimitStore(client);

    await expect(
      store.consume([{ key: "minute", limit: 1, windowMs: 1_000 }]),
    ).rejects.toThrow("redis unavailable");

    evalMock.mockResolvedValueOnce(["invalid"]);
    await expect(store.acquireConcurrency("user-1", 1, 1_000)).rejects.toThrow(
      "Invalid Redis rate limit response",
    );
  });
});
